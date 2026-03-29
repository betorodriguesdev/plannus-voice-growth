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

  try {
    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    const RETELL_AGENT_ID = Deno.env.get("RETELL_AGENT_ID");
    
    if (!RETELL_API_KEY || !RETELL_AGENT_ID) {
      throw new Error("Retell credentials not configured");
    }

    const body = await req.json();
    const { lead_id, phone_number, phone, pastor_name, church_name, language: lang } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let pastorName = pastor_name || "Pastor";
    let churchName = church_name || "";
    let callLanguage = lang || "en";
    let lead: any = null;
    let effectiveLeadId = lead_id || null;

    if (lead_id) {
      // If lead_id provided, fetch from DB
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      lead = data;
      if (lead) {
        pastorName = lead.pastor_name || pastorName;
        churchName = lead.church_name || churchName;
        callLanguage = lead.language || callLanguage;
      }
    } else {
      // No lead_id → create or find lead automatically
      const toNum = phone_number || phone;
      if (toNum) {
        // Check if lead already exists by phone
        const { data: existing } = await supabase
          .from("leads")
          .select("*")
          .eq("phone", toNum)
          .limit(1);

        if (existing && existing.length > 0) {
          lead = existing[0];
          effectiveLeadId = lead.id;
          pastorName = lead.pastor_name || pastorName;
          churchName = lead.church_name || churchName;
          callLanguage = lead.language || callLanguage;
          console.log(`Found existing lead by phone: ${effectiveLeadId}`);
        } else {
          // Create new lead
          const { data: newLead, error: insertErr } = await supabase.from("leads").insert({
            church_name: churchName || null,
            pastor_name: pastorName !== "Pastor" ? pastorName : null,
            phone: toNum,
            language: callLanguage,
            status: "em_contato",
            source: "manual",
            score: 0,
          }).select().single();

          if (insertErr) {
            console.error("Error creating lead:", insertErr);
          } else {
            lead = newLead;
            effectiveLeadId = newLead.id;
            console.log(`Created new lead: ${effectiveLeadId}`);
          }
        }
      }
    }

    const toNumber = phone_number || phone;

    if (!toNumber) {
      throw new Error("No phone number provided (use 'phone_number' or 'phone')");
    }

    console.log(`Initiating call to ${toNumber} for ${pastorName} at ${churchName} [lang: ${callLanguage}]`);

    const callRes = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: RETELL_AGENT_ID,
        from_number: "+15089012335",
        to_number: toNumber,
        retell_llm_dynamic_variables: {
          contact_name: pastorName,
          church_name: churchName,
          language: callLanguage,
          language_instruction: "CRITICAL RULES YOU MUST FOLLOW: 1) LANGUAGE DETECTION: Listen to the VERY FIRST words the person says when they pick up. If they say 'Hello', 'Hi', 'Good morning', 'Parish' or ANY English word, you MUST speak English for the ENTIRE call. If they say 'Alô', 'Bom dia', 'Oi' or any Portuguese word, speak Portuguese. If they say 'Hola', 'Buenos días' or any Spanish word, speak Spanish. Detect the language INSTANTLY from their first utterance and match it. NEVER speak a different language than the person. 2) NATURAL CONVERSATION: You are NOT a scripted robot. NEVER use canned phrases like 'Certamente, pastor', 'Com certeza', 'Absolutamente', 'Certo, pastor'. Actually LISTEN to what the person says and respond appropriately to their ACTUAL words. React like a real human would in a phone conversation. Be warm, natural, and conversational. 3) PHONE NUMBER CAPTURE: NEVER assume the phone number you are calling is the number where the person wants to receive the link. NEVER ask 'is this the same number?' or 'can I send it to this number we are talking on?'. You DO NOT KNOW the person's cell phone number. You MUST always ask: 'What is the best phone number for me to send you the link?' or 'Qual o melhor número de celular pra eu te enviar o link?' or '¿Cuál es el mejor número para enviarle el enlace?'. Wait for them to dictate the full number. Only use the number they explicitly provide. 4) LINK DELIVERY PRIORITY: Your PRIMARY goal is to get the phone number and send the link via SMS. Do NOT ask for email during the call. ONLY if the person voluntarily offers their email or asks to receive it by email, then you can take it. Otherwise, just get the phone number, send the SMS, and wrap up naturally. Keep the call short and efficient. 5) SILENCE HANDLING: If the person pauses or goes silent for a moment, wait 2-3 seconds naturally before speaking. Do NOT rush to fill every silence. Only prompt gently after a longer silence (5+ seconds) with something natural like 'You still there?' or 'Tá me ouvindo?' or '¿Sigue ahí?'.",
        },
        metadata: { lead_id: effectiveLeadId },
      }),
    });

    const callData = await callRes.json();

    if (!callRes.ok) {
      console.error("Retell error:", JSON.stringify(callData));
      throw new Error(`Retell API error: ${JSON.stringify(callData)}`);
    }

    console.log("Call created:", callData.call_id);

    // Update lead if exists
    if (effectiveLeadId) {
      const attempts = (lead?.call_attempts || 0) + 1;
      await supabase.from("leads").update({
        call_attempts: attempts,
        last_contact_at: new Date().toISOString(),
        status: "em_contato",
        updated_at: new Date().toISOString(),
      }).eq("id", effectiveLeadId);
    }

    // Log the call
    await supabase.from("call_logs").insert({
      retell_call_id: callData.call_id,
      lead_id: effectiveLeadId,
      agent_id: RETELL_AGENT_ID,
      call_status: "initiated",
      direction: "outbound",
      to_number: toNumber,
      attempt_number: (lead?.call_attempts || 0) + 1,
      started_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      call_id: callData.call_id,
      contact_name: pastorName,
      church_name: churchName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
