import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tableId } = await req.json();
    
    if (!tableId) {
      return new Response(
        JSON.stringify({ success: false, error: "tableId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find player by user_id
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ success: false, error: "Player not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find any "disconnected" or stale records for this player on this table
    const { data: staleRecords, error: findError } = await supabase
      .from("poker_table_players")
      .select("id, status, seat_number")
      .eq("table_id", tableId)
      .eq("player_id", player.id)
      .in("status", ["disconnected", "sitting_out"]);

    if (findError) {
      console.error("[poker-reconnect-repair] Error finding stale records:", findError);
      return new Response(
        JSON.stringify({ success: false, error: findError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staleRecords || staleRecords.length === 0) {
      // No stale records - nothing to repair
      return new Response(
        JSON.stringify({ success: true, repaired: 0, message: "No stale records found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete stale records so the WebSocket server can create fresh ones
    const staleIds = staleRecords.map(r => r.id);
    const { error: deleteError } = await supabase
      .from("poker_table_players")
      .delete()
      .in("id", staleIds);

    if (deleteError) {
      console.error("[poker-reconnect-repair] Error deleting stale records:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[poker-reconnect-repair] Repaired ${staleRecords.length} stale records for player ${player.name} on table ${tableId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        repaired: staleRecords.length,
        message: `Deleted ${staleRecords.length} stale seat(s)`,
        seats: staleRecords.map(r => r.seat_number)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[poker-reconnect-repair] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
