import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
  const RETELL_AGENT_ID = Deno.env.get("RETELL_AGENT_ID");
  if (!RETELL_API_KEY || !RETELL_AGENT_ID) {
    return new Response(JSON.stringify({ error: "Retell credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Fetch all calls from Retell for this agent
    const retellRes = await fetch("https://api.retellai.com/v2/list-calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter_criteria: {
          agent_id: [RETELL_AGENT_ID],
        },
        sort_order: "descending",
        limit: 1000,
      }),
    });

    if (!retellRes.ok) {
      const err = await retellRes.text();
      console.error("Retell list-calls error:", err);
      throw new Error(`Retell API error ${retellRes.status}: ${err}`);
    }

    const retellCalls: any[] = await retellRes.json();
    console.log(`Retell returned ${retellCalls.length} calls for agent ${RETELL_AGENT_ID}`);

    // Get existing retell_call_ids from our DB
    const { data: existing } = await supabase
      .from("call_logs")
      .select("retell_call_id")
      .not("retell_call_id", "is", null);

    const existingIds = new Set((existing || []).map((r: any) => r.retell_call_id));

    let synced = 0;
    let updated = 0;

    for (const call of retellCalls) {
      const callId = call.call_id;
      const durationMs = call.end_timestamp && call.start_timestamp
        ? call.end_timestamp - call.start_timestamp
        : null;
      const durationSec = durationMs ? Math.round(durationMs / 1000) : null;

      // Try to find lead by to_number
      let leadId: string | null = call.metadata?.lead_id || null;
      if (!leadId && call.to_number) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", call.to_number)
          .limit(1)
          .maybeSingle();
        if (lead) leadId = lead.id;
      }

      const callRecord = {
        retell_call_id: callId,
        lead_id: leadId,
        agent_id: call.agent_id || RETELL_AGENT_ID,
        call_status: call.call_status || call.status || "unknown",
        direction: call.direction || "outbound",
        to_number: call.to_number || null,
        from_number: call.from_number || null,
        duration_seconds: durationSec,
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
        ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
        transcript: call.transcript || null,
        summary: call.call_analysis?.call_summary || null,
        sentiment: call.call_analysis?.user_sentiment || null,
        metadata: {
          recording_url: call.recording_url || null,
          transcript_object: call.transcript_object || null,
          disconnection_reason: call.disconnection_reason || null,
          call_analysis: call.call_analysis || null,
        },
        updated_at: new Date().toISOString(),
      };

      if (existingIds.has(callId)) {
        // Update existing record with fresh data from Retell
        await supabase
          .from("call_logs")
          .update(callRecord)
          .eq("retell_call_id", callId);
        updated++;
      } else {
        // Insert new record
        await supabase
          .from("call_logs")
          .insert({ ...callRecord, created_at: new Date().toISOString() });
        synced++;
      }
    }

    console.log(`Sync complete: ${synced} new, ${updated} updated`);

    return new Response(JSON.stringify({
      success: true,
      total_retell: retellCalls.length,
      synced,
      updated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
