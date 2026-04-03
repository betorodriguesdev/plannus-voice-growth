import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const payload = await req.json();

    // Resend webhook payload structure
    // { type: "email.delivered", data: { email_id: "..." , ... } }
    const eventType = payload.type; // email.delivered, email.opened, email.clicked, email.bounced, email.complained
    const emailId = payload.data?.email_id;

    if (!eventType || !emailId) {
      return new Response(
        JSON.stringify({ error: "Missing type or email_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar tipo do evento
    const normalizedType = eventType.replace("email.", "");

    // Buscar o email_step pelo resend_email_id
    const { data: step, error: stepError } = await supabase
      .from("email_steps")
      .select("id, sequence_id, status")
      .eq("resend_email_id", emailId)
      .single();

    if (stepError || !step) {
      console.log(`Step not found for resend_email_id: ${emailId}`);
      return new Response(
        JSON.stringify({ ok: true, message: "Step not found, ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inserir evento
    await supabase.from("email_events").insert({
      step_id: step.id,
      event_type: normalizedType,
      payload,
    });

    // Atualizar status do step conforme o evento
    const now = new Date().toISOString();
    const updates: Record<string, string> = {};

    switch (normalizedType) {
      case "delivered":
        if (step.status === "sent") {
          updates.status = "delivered";
        }
        break;
      case "opened":
        updates.status = "opened";
        updates.opened_at = now;
        break;
      case "clicked":
        updates.status = "clicked";
        updates.clicked_at = now;
        break;
      case "bounced":
        updates.status = "bounced";
        break;
      case "complained":
        updates.status = "bounced";
        break;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("email_steps")
        .update(updates)
        .eq("id", step.id);
    }

    // Se bounced ou complained → parar a sequência inteira
    if (normalizedType === "bounced" || normalizedType === "complained") {
      await supabase
        .from("email_sequences")
        .update({
          status: "stopped",
          stopped_reason: normalizedType,
        })
        .eq("id", step.sequence_id);

      // Cancelar steps pendentes
      await supabase
        .from("email_steps")
        .update({ status: "cancelled" })
        .eq("sequence_id", step.sequence_id)
        .eq("status", "pending");

      console.log(`Sequence ${step.sequence_id} stopped: ${normalizedType}`);
    }

    console.log(`Event ${normalizedType} processed for step ${step.id}`);

    return new Response(
      JSON.stringify({ ok: true, event: normalizedType, step_id: step.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
