import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_id } = await req.json();
    if (!call_id) {
      return new Response(JSON.stringify({ error: "Missing call_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    if (!RETELL_API_KEY) {
      throw new Error("RETELL_API_KEY not configured");
    }

    const res = await fetch(`https://api.retellai.com/v2/get-call/${call_id}`, {
      headers: { "Authorization": `Bearer ${RETELL_API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Retell API error:", err);
      return new Response(JSON.stringify({ error: "Failed to fetch call data" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callData = await res.json();

    return new Response(JSON.stringify({
      recording_url: callData.recording_url || null,
      transcript: callData.transcript || null,
      transcript_object: callData.transcript_object || null,
      call_analysis: callData.call_analysis || null,
      duration_ms: callData.end_timestamp && callData.start_timestamp
        ? callData.end_timestamp - callData.start_timestamp
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
