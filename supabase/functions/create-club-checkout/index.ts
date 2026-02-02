import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price IDs for club subscriptions
const PRICE_IDS = {
  basic: "price_1SwSWAQcOGwBnQZtyIMLZIss",    // 2500₽/мес
  pro: "price_1SwSXjQcOGwBnQZt1tePlJgS",      // 5000₽/мес
  enterprise: "price_1SwSZVQcOGwBnQZtJhchA1yQ" // 60000₽/год
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CLUB-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    const { plan, clanId } = await req.json();
    if (!plan || !clanId) throw new Error("Missing plan or clanId");
    
    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    if (!priceId) throw new Error(`Invalid plan: ${plan}`);
    logStep("Plan selected", { plan, priceId, clanId });

    // Verify user is owner of the clan
    const { data: clan, error: clanError } = await supabaseClient
      .from('clans')
      .select('id, don_player_id')
      .eq('id', clanId)
      .single();

    if (clanError || !clan) throw new Error("Clan not found");

    const { data: player } = await supabaseClient
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!player || clan.don_player_id !== player.id) {
      throw new Error("Only clan owner can manage subscription");
    }
    logStep("User verified as clan owner");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://epc-poker.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/club-admin?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/club-admin?subscription=canceled`,
      metadata: {
        clan_id: clanId,
        plan: plan,
        user_id: user.id
      },
      subscription_data: {
        metadata: {
          clan_id: clanId,
          plan: plan
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
