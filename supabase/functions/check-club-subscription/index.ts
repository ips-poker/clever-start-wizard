import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product IDs for club subscriptions
const PRODUCT_TO_PLAN = {
  "prod_TuH4sVzVZW1mSl": "basic",
  "prod_TuH5mJS4890hdp": "pro",
  "prod_TuH7t0hpODtNi5": "enterprise"
};

const PLAN_LIMITS = {
  free: { max_tournaments: 3, max_players: 20, max_staff: 2, max_online_tables: 0 },
  basic: { max_tournaments: 10, max_players: 50, max_staff: 5, max_online_tables: 1 },
  pro: { max_tournaments: 30, max_players: 200, max_staff: 10, max_online_tables: 5 },
  enterprise: { max_tournaments: 1000, max_players: 2500, max_staff: 50, max_online_tables: 20 }
};

const PLAN_FEATURES = {
  free: { voice_control: false, online_poker: false, analytics: false, api_access: false },
  basic: { voice_control: true, online_poker: false, analytics: true, api_access: false },
  pro: { voice_control: true, online_poker: true, analytics: true, api_access: true },
  enterprise: { voice_control: true, online_poker: true, analytics: true, api_access: true }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CLUB-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { clanId } = await req.json();
    if (!clanId) throw new Error("Missing clanId");
    logStep("Checking subscription for clan", { clanId });

    // Get clan info
    const { data: clan, error: clanError } = await supabaseClient
      .from('clans')
      .select('id, don_player_id')
      .eq('id', clanId)
      .single();

    if (clanError || !clan) throw new Error("Clan not found");

    // Get owner's email
    const { data: owner } = await supabaseClient
      .from('players')
      .select('user_id')
      .eq('id', clan.don_player_id)
      .single();

    if (!owner?.user_id) {
      logStep("No owner user_id found, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        ...PLAN_LIMITS.free,
        features: PLAN_FEATURES.free
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: ownerAuth } = await supabaseClient.auth.admin.getUserById(owner.user_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (!ownerEmail) {
      logStep("Owner email not found, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        ...PLAN_LIMITS.free,
        features: PLAN_FEATURES.free
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found owner email", { ownerEmail });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find customer by owner's email
    const customers = await stripe.customers.list({ email: ownerEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        ...PLAN_LIMITS.free,
        features: PLAN_FEATURES.free
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions with clan_id metadata
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Find subscription for this clan
    const clanSubscription = subscriptions.data.find(
      sub => sub.metadata?.clan_id === clanId
    );

    if (!clanSubscription) {
      logStep("No active subscription for this clan, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        ...PLAN_LIMITS.free,
        features: PLAN_FEATURES.free
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const productId = clanSubscription.items.data[0]?.price?.product as string;
    const plan = PRODUCT_TO_PLAN[productId as keyof typeof PRODUCT_TO_PLAN] || "basic";
    const subscriptionEnd = new Date(clanSubscription.current_period_end * 1000).toISOString();
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES];

    logStep("Active subscription found", { 
      subscriptionId: clanSubscription.id, 
      plan, 
      productId,
      subscriptionEnd 
    });

    // Update club_subscriptions table
    const { error: updateError } = await supabaseClient
      .from('club_subscriptions')
      .upsert({
        clan_id: clanId,
        plan: plan,
        payment_status: 'active',
        expires_at: subscriptionEnd,
        ...limits,
        features: features,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clan_id'
      });

    if (updateError) {
      logStep("Warning: Failed to update club_subscriptions", { error: updateError.message });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan: plan,
      subscription_end: subscriptionEnd,
      ...limits,
      features: features
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
