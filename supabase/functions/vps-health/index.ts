import { corsHeaders } from "../_shared/cors.ts";

// Proxy VPS /health through Supabase Edge Function to avoid browser CORS/Tunnel issues.
// This function is public (uses anon key on client) but only exposes the same health JSON the VPS exposes.

const VPS_HEALTH_URL = "https://syndicate-poker-server.ru/health";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const start = Date.now();
    console.log("[vps-health] request", { method: req.method, url: VPS_HEALTH_URL });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(VPS_HEALTH_URL, {
      method: "GET",
      headers: {
        "accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    const text = await res.text();

    console.log("[vps-health] response", { status: res.status, latencyMs });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, status: res.status, latencyMs, body: text.slice(0, 500) }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let health: unknown = null;
    try {
      health = JSON.parse(text);
    } catch (e) {
      console.log("[vps-health] json parse failed", String(e));
      return new Response(
        JSON.stringify({ ok: false, status: 502, latencyMs, error: "Invalid JSON from VPS" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, latencyMs, health }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.log("[vps-health] error", String(e));
    return new Response(
      JSON.stringify({ ok: false, status: 502, error: String(e) }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
