import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Wake Idle Tables - Called by pg_cron to ensure VPS loads idle tables with players
 * 
 * This function:
 * 1. Finds tables in 'waiting' status with 2+ active players
 * 2. Calls VPS /api/wake-table endpoint to load them into memory
 * 3. VPS will then trigger checkStartHand automatically
 */

const VPS_BASE_URL = "http://89.104.74.121:3001";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results: { tableId: string; tableName: string; status: string; error?: string }[] = [];

  try {
    console.log("[wake-idle-tables] Starting check for idle tables");

    // Find tables that are waiting with enough players
    const { data: idleTables, error } = await supabase
      .from("poker_tables")
      .select(`
        id,
        name,
        status,
        current_hand_id,
        auto_start_enabled,
        updated_at
      `)
      .eq("status", "waiting")
      .is("current_hand_id", null)
      .eq("auto_start_enabled", true);

    if (error) {
      console.error("[wake-idle-tables] Error fetching tables:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!idleTables || idleTables.length === 0) {
      console.log("[wake-idle-tables] No idle tables found");
      return new Response(
        JSON.stringify({ ok: true, message: "No idle tables", woken: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each idle table, check if it has enough players
    for (const table of idleTables) {
      const { data: players, error: playerError } = await supabase
        .from("poker_table_players")
        .select("id, status, stack")
        .eq("table_id", table.id)
        .eq("status", "active")
        .gt("stack", 0);

      if (playerError) {
        console.error(`[wake-idle-tables] Error fetching players for ${table.name}:`, playerError);
        results.push({ tableId: table.id, tableName: table.name, status: "error", error: playerError.message });
        continue;
      }

      const activePlayerCount = players?.length || 0;

      if (activePlayerCount < 2) {
        console.log(`[wake-idle-tables] Table ${table.name} has only ${activePlayerCount} active players, skipping`);
        continue;
      }

      // Table has enough players - wake it up on VPS
      console.log(`[wake-idle-tables] Waking table ${table.name} with ${activePlayerCount} players`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const wakeResponse = await fetch(`${VPS_BASE_URL}/api/wake-table`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableId: table.id }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (wakeResponse.ok) {
          const wakeData = await wakeResponse.json();
          console.log(`[wake-idle-tables] Successfully woke table ${table.name}:`, wakeData);
          results.push({ tableId: table.id, tableName: table.name, status: "woken" });
        } else {
          const errorText = await wakeResponse.text();
          console.error(`[wake-idle-tables] Failed to wake table ${table.name}:`, errorText);
          results.push({ tableId: table.id, tableName: table.name, status: "failed", error: errorText });
        }
      } catch (fetchError) {
        console.error(`[wake-idle-tables] VPS unreachable for table ${table.name}:`, String(fetchError));
        results.push({ tableId: table.id, tableName: table.name, status: "vps_unreachable", error: String(fetchError) });
      }
    }

    const wokenCount = results.filter(r => r.status === "woken").length;
    console.log(`[wake-idle-tables] Completed. Woken: ${wokenCount}/${idleTables.length}`);

    return new Response(
      JSON.stringify({ ok: true, woken: wokenCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("[wake-idle-tables] Unexpected error:", String(e));
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
