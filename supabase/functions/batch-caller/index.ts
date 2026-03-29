import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════
// BATCH CALLER CONFIG
// ═══════════════════════════════════════════════════
const CONFIG = {
  DAILY_LIMIT: 80,
  MORNING_LIMIT: 40,
  AFTERNOON_LIMIT: 40,
  BATCH_SIZE: 20,
  MIN_INTERVAL_MS: 45_000,
  MAX_INTERVAL_MS: 120_000,
  MAX_NO_ANSWER_STREAK: 10,
  SCHEDULE: {
    // Mon-Fri, America/New_York
    morning: { start: 9.5, end: 11.5 },   // 9:30 AM - 11:30 AM
    afternoon: { start: 14, end: 16.5 },   // 2:00 PM - 4:30 PM
  },
  SATURDAY: {
    morning: { start: 9.5, end: 14 },      // 9:30 AM - 2:00 PM (no afternoon)
    DAILY_LIMIT: 40,
  },
};

function getRandomInterval() {
  return Math.floor(Math.random() * (CONFIG.MAX_INTERVAL_MS - CONFIG.MIN_INTERVAL_MS)) + CONFIG.MIN_INTERVAL_MS;
}

function getEasternOffset(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchFirstDay = marchFirst.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, 8 + (7 - marchFirstDay) % 7, 7));
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const novFirstDay = novFirst.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 10, 1 + (7 - novFirstDay) % 7, 6));
  return (now >= dstStart && now < dstEnd) ? -4 : -5;
}

function getEasternTime(): { hour: number; minute: number; day: number } {
  const now = new Date();
  const offset = getEasternOffset();
  const eastern = new Date(now.getTime() + offset * 3600000);
  return {
    hour: eastern.getUTCHours(),
    minute: eastern.getUTCMinutes(),
    day: eastern.getUTCDay(),
  };
}

function getDecimalHour(): number {
  const { hour, minute } = getEasternTime();
  return hour + minute / 60;
}

type TimeWindow = 'morning' | 'afternoon' | 'outside';

function getCurrentWindow(): TimeWindow {
  const { day } = getEasternTime();
  // Sunday OFF
  if (day === 0) return 'outside';

  const decHour = getDecimalHour();

  // Saturday: only morning window (9:30 AM - 2:00 PM)
  if (day === 6) {
    const { morning } = CONFIG.SATURDAY;
    if (decHour >= morning.start && decHour < morning.end) return 'morning';
    return 'outside';
  }

  // Weekdays (Mon-Fri)
  const { morning, afternoon } = CONFIG.SCHEDULE;
  if (decHour >= morning.start && decHour < morning.end) return 'morning';
  if (decHour >= afternoon.start && decHour < afternoon.end) return 'afternoon';
  return 'outside';
}

function formatPhone(phone: string): string | null {
  let p = phone.replace(/[\s\-\(\)\.]/g, '');
  if (!p.startsWith('+')) {
    if (p.length === 10) p = '+1' + p;
    else if (p.length === 11 && p.startsWith('1')) p = '+' + p;
    else return null;
  }
  return p;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const window = getCurrentWindow();
    const { hour, minute, day } = getEasternTime();
    console.log(`Schedule check: ET ${hour}:${String(minute).padStart(2,'0')}, day=${day}, window=${window}`);

    if (window === 'outside') {
      return new Response(JSON.stringify({ success: true, message: "Outside calling hours", calls_made: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count today's calls
    const todayStart = new Date();
    const offset = getEasternOffset();
    const eastern = new Date(todayStart.getTime() + offset * 3600000);
    eastern.setUTCHours(0, 0, 0, 0);
    const todayStartUTC = new Date(eastern.getTime() - offset * 3600000);

    const { count: totalToday } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .gte("started_at", todayStartUTC.toISOString());

    const dailyLimit = day === 6 ? CONFIG.SATURDAY.DAILY_LIMIT : CONFIG.DAILY_LIMIT;
    if ((totalToday || 0) >= dailyLimit) {
      console.log(`Daily limit reached (${totalToday}/${dailyLimit})`);
      return new Response(JSON.stringify({ success: true, message: "Daily limit reached", calls_made: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check window-specific limits
    const windowLimit = window === 'morning' ? CONFIG.MORNING_LIMIT : CONFIG.AFTERNOON_LIMIT;
    const windowStart = window === 'morning' ? CONFIG.SCHEDULE.morning.start : CONFIG.SCHEDULE.afternoon.start;
    const windowStartDate = new Date(eastern.getTime());
    windowStartDate.setUTCHours(Math.floor(windowStart), (windowStart % 1) * 60, 0, 0);
    const windowStartUTC = new Date(windowStartDate.getTime() - offset * 3600000);

    const { count: windowCount } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .gte("started_at", windowStartUTC.toISOString());

    if ((windowCount || 0) >= windowLimit) {
      console.log(`${window} window limit reached (${windowCount}/${windowLimit})`);
      return new Response(JSON.stringify({ success: true, message: `${window} limit reached`, calls_made: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remainingInWindow = windowLimit - (windowCount || 0);
    const batchSize = Math.min(CONFIG.BATCH_SIZE, remainingInWindow);

    // Get eligible leads: status=novo (not yet contacted), has phone, pt or es
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "novo")
      .in("language", ["pt", "es"])
      .not("phone", "is", null)
      .order("call_attempts", { ascending: true })
      .order("score", { ascending: false })
      .limit(batchSize);

    if (!leads || leads.length === 0) {
      console.log("No eligible leads to call.");
      return new Response(JSON.stringify({ success: true, message: "No leads to call", calls_made: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting batch: ${leads.length} leads (window: ${window})`);

    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    const RETELL_AGENT_ID = Deno.env.get("RETELL_AGENT_ID");
    if (!RETELL_API_KEY || !RETELL_AGENT_ID) {
      throw new Error("Retell credentials not configured");
    }

    let callsMade = 0;
    let noAnswerStreak = 0;
    const results: Array<{ lead_id: string; business: string; status: string }> = [];

    for (const lead of leads) {
      if (noAnswerStreak >= CONFIG.MAX_NO_ANSWER_STREAK) {
        console.log(`Auto-pause: ${noAnswerStreak} no-answer streak.`);
        break;
      }

      if (getCurrentWindow() === 'outside') {
        console.log("Schedule window ended mid-batch.");
        break;
      }

      if (!lead.phone) continue;

      const phoneE164 = formatPhone(lead.phone);
      if (!phoneE164) {
        console.log(`Skipping lead ${lead.id} - invalid phone: ${lead.phone}`);
        continue;
      }

      const churchName = lead.business_name || lead.church_name || "";
      const language = lead.language || "en";

      console.log(`Calling ${churchName} [${language}] — ${lead.phone}`);

      try {
        const callRes = await fetch("https://api.retellai.com/v2/create-phone-call", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RETELL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: RETELL_AGENT_ID,
            from_number: "+17816537984",
            to_number: phoneE164,
            retell_llm_dynamic_variables: {
              business_name: churchName,
              language: language,
              language_instruction: "CRITICAL RULES YOU MUST FOLLOW: 1) LANGUAGE DETECTION: Listen to the VERY FIRST words the person says when they pick up. If they say 'Hello', 'Hi', 'Good morning', 'Parish' or ANY English word, you MUST speak English for the ENTIRE call. If they say 'Alô', 'Bom dia', 'Oi' or any Portuguese word, speak Portuguese. If they say 'Hola', 'Buenos días' or any Spanish word, speak Spanish. Detect the language INSTANTLY from their first utterance and match it. NEVER speak a different language than the person. 2) NATURAL CONVERSATION: You are NOT a scripted robot. NEVER use canned phrases like 'Certamente, pastor', 'Com certeza', 'Absolutamente', 'Certo, pastor'. Actually LISTEN to what the person says and respond appropriately to their ACTUAL words. React like a real human would in a phone conversation. Be warm, natural, and conversational. 3) PHONE NUMBER CAPTURE — THIS IS THE MOST IMPORTANT RULE: You DO NOT know the person's cell phone number. You MUST NEVER say 'is this the same number we are talking on?', 'can I send it to this number?', 'posso enviar pra esse mesmo número?', 'é esse mesmo número?', or ANY variation suggesting you already have their number. This is STRICTLY FORBIDDEN — if you do this, the call FAILS. Instead, you MUST ALWAYS ask them to DICTATE the full number: 'What is the best cell phone number for me to send you the link?' / 'Qual o melhor número de celular pra eu te enviar o link?' / '¿Cuál es el mejor número de celular para enviarle el enlace?'. Wait for them to say the COMPLETE number digit by digit. Even if they say 'send it here' or 'this number is fine', reply with 'Great, could you please say the number for me so I can make sure I have it right?' / 'Ótimo, pode me ditar o número por favor pra eu garantir que tá certo?'. ONLY use the number they explicitly dictate. 4) LINK DELIVERY PRIORITY: Your PRIMARY goal is to get the phone number and send the link via SMS. Do NOT ask for email during the call. ONLY if the person voluntarily offers their email or asks to receive it by email, then you can take it. Otherwise, just get the phone number, send the SMS, and wrap up naturally. Keep the call short and efficient. 5) SILENCE HANDLING: If the person pauses or goes silent for a moment, wait 2-3 seconds naturally before speaking. Do NOT rush to fill every silence. Only prompt gently after a longer silence (5+ seconds) with something natural like 'You still there?' or 'Tá me ouvindo?' or '¿Sigue ahí?'.",
            },
            metadata: { lead_id: lead.id },
          }),
        });

        const callData = await callRes.json();

        if (!callRes.ok) {
          console.error(`Retell error for ${lead.id}:`, JSON.stringify(callData));
          results.push({ lead_id: lead.id, business: churchName, status: "error" });
          continue;
        }

        const attempts = (lead.call_attempts || 0) + 1;

        await supabase.from("leads").update({
          call_attempts: attempts,
          last_contact_at: new Date().toISOString(),
          status: "em_contato",
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);

        await supabase.from("call_logs").insert({
          retell_call_id: callData.call_id,
          lead_id: lead.id,
          agent_id: RETELL_AGENT_ID,
          call_status: "initiated",
          direction: "outbound",
          to_number: lead.phone,
          attempt_number: attempts,
          started_at: new Date().toISOString(),
        });

        callsMade++;
        results.push({ lead_id: lead.id, business: churchName, status: "initiated" });
        console.log(`Call ${callsMade} initiated: ${callData.call_id}`);

        if (callsMade < leads.length) {
          const delay = getRandomInterval();
          console.log(`Waiting ${Math.round(delay / 1000)}s before next call...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        console.error(`Error calling lead ${lead.id}:`, err);
        results.push({ lead_id: lead.id, business: churchName, status: "error" });
      }
    }

    console.log(`Batch complete: ${callsMade} calls made`);

    return new Response(JSON.stringify({
      success: true,
      window,
      calls_made: callsMade,
      total_today: (totalToday || 0) + callsMade,
      no_answer_streak: noAnswerStreak,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch caller error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
