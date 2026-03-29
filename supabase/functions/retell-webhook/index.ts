import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    console.log("Retell webhook received:", JSON.stringify(payload));

    const { event, call } = payload;

    if (!call?.call_id) {
      return new Response(JSON.stringify({ error: "Missing call_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateData: Record<string, unknown> = {
      call_status: call.call_status || event,
      updated_at: new Date().toISOString(),
    };

    if (call.end_timestamp) updateData.ended_at = new Date(call.end_timestamp).toISOString();
    if (call.duration_ms) updateData.duration_seconds = Math.round(call.duration_ms / 1000);
    if (call.transcript) updateData.transcript = call.transcript;
    if (call.call_analysis?.call_summary) updateData.summary = call.call_analysis.call_summary;
    if (call.call_analysis?.user_sentiment) updateData.sentiment = call.call_analysis.user_sentiment;

    const { data: callLog, error } = await supabase
      .from("call_logs")
      .update(updateData)
      .eq("retell_call_id", call.call_id)
      .select("*, leads(id, church_name, call_attempts)")
      .single();

    if (error) {
      console.error("Error updating call log:", error);
    }

    // Auto-update lead status based on call outcome
    if (callLog?.lead_id && (event === "call_ended" || call.call_status === "ended")) {
      const sentiment = call.call_analysis?.user_sentiment;
      const attempts = callLog.leads?.call_attempts || 0;
      
      // Determine resultado_ligacao
      let resultadoLigacao = "nao_atendeu";
      let leadStatus = "em_contato";

      if (call.disconnection_reason === "no_answer") {
        resultadoLigacao = "nao_atendeu";
      } else if (call.disconnection_reason === "busy") {
        resultadoLigacao = "ocupado";
      } else if (sentiment === "Positive") {
        resultadoLigacao = "interessado";
        leadStatus = "falou_com_pastor";
      } else if (sentiment === "Negative") {
        resultadoLigacao = "nao_interessado";
        leadStatus = "falou_com_pastor";
      } else {
        resultadoLigacao = "atendeu";
        leadStatus = "falou_com_pastor";
      }

      // Check call summary for "callback" / "retorno" keywords
      const summary = (call.call_analysis?.call_summary || "").toLowerCase();
      if (summary.includes("call back") || summary.includes("retorno") || summary.includes("ligar depois")) {
        resultadoLigacao = "pediu_retorno";
      }

      // Handle no-answer / busy → retry logic
      if (resultadoLigacao === "nao_atendeu" || resultadoLigacao === "ocupado") {
        leadStatus = attempts >= 3 ? "sem_resposta" : "novo"; // back to novo so batch-caller picks it up

        // Schedule retry with proper spacing: attempt 2 → 2 days, attempt 3 → 7 days
        if (attempts < 3) {
          const retryDays = attempts === 1 ? 2 : 7;
          const retryDate = new Date();
          retryDate.setDate(retryDate.getDate() + retryDays);
          
          await supabase.from("calendar_events").insert({
            title: `Re-tentativa ${attempts + 1}: ${callLog.leads?.church_name || "Lead"}`,
            event_type: "ai_call_retry",
            lead_id: callLog.lead_id,
            start_time: retryDate.toISOString(),
            status: "scheduled",
            color: "#ef4444",
          });

          await supabase.from("leads").update({
            next_follow_up_at: retryDate.toISOString(),
          }).eq("id", callLog.lead_id);
        }
      }

      await supabase.from("leads").update({
        status: leadStatus,
        resultado_ligacao: resultadoLigacao,
        updated_at: new Date().toISOString(),
      }).eq("id", callLog.lead_id);

      // Envio de link agora é feito apenas via ferramenta explícita do agente,
      // após confirmação do número pelo pastor durante a conversa.
      if (callLog?.lead_id) {
        console.log("Auto-send de vídeo desativado no webhook para evitar envio sem confirmação explícita do número.");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
