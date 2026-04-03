import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDERS = [
  "Amanda | Plannus <amanda@innovacall.co>",
  "Equipe Plannus <equipe@innovacall.co>",
  "Contato Plannus <contato@innovacall.co>",
];

const SYSTEM_PROMPT = `Você é uma especialista brasileira em outreach B2B chamada Amanda. Você escreve emails curtos, conversacionais e personalizados em português para donos de empresas brasileiras nos EUA.

O produto é o Plannus — uma plataforma com IA que automatiza agendamento, faturamento, CRM e gestão financeira para prestadores de serviço (landscaping, cleaning, construction, painting, roofing, drywall).

REGRAS OBRIGATÓRIAS:
- Escreva como uma pessoa REAL, NÃO como marketing
- NUNCA use emojis no subject
- NUNCA use CAPS LOCK no subject
- Emails CURTOS (máximo 6-8 linhas no body)
- Tom informal mas profissional
- Mencione o nome da empresa e nicho específico
- Body em HTML simples (use <p>, <br>, <strong> apenas)
- NÃO use templates genéricos
- Inclua sempre um CTA claro mas suave
- Assine como "Amanda — Plannus"`;

function getUserPrompt(
  business_name: string,
  niche: string,
  city: string,
  owner_name?: string
) {
  const ownerLine = owner_name ? `Dono: ${owner_name}.` : "";
  return `Gere uma sequência de 4 emails para a empresa "${business_name}" (${niche}) em ${city}. ${ownerLine}

Estrutura da sequência:
- Email 1 (Dia 0): Apresentação — mencione o nicho e a cidade deles, pergunte sobre os desafios de gestão
- Email 2 (Dia 2): Prova social — mencione que outros brasileiros do mesmo nicho nos EUA estão usando o Plannus
- Email 3 (Dia 5): Dica de valor — compartilhe uma dica prática relevante pro nicho deles
- Email 4 (Dia 8): Último toque — ofereça uma demo rápida de 15 min, tom amigável de "estou por aqui se precisar"

Retorne APENAS um JSON array com 4 objetos, sem explicação:
[
  { "step_number": 1, "subject": "...", "body_html": "...", "send_after_hours": 0 },
  { "step_number": 2, "subject": "...", "body_html": "...", "send_after_hours": 48 },
  { "step_number": 3, "subject": "...", "body_html": "...", "send_after_hours": 120 },
  { "step_number": 4, "subject": "...", "body_html": "...", "send_after_hours": 192 }
]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not configured — set it via: supabase secrets set OPENAI_API_KEY=sk-...");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { lead_id, business_name, owner_name, niche, city } =
      await req.json();

    if (!lead_id || !business_name || !niche || !city) {
      throw new Error(
        "Missing required fields: lead_id, business_name, niche, city"
      );
    }

    // Checar se já existe sequência ativa pro lead
    const { data: existing } = await supabase
      .from("email_sequences")
      .select("id, status")
      .eq("lead_id", lead_id)
      .single();

    if (existing && existing.status === "active") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Já existe uma sequência ativa para este lead",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Gerar copy via OpenAI
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.8,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: getUserPrompt(business_name, niche, city, owner_name),
            },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const openaiData = await openaiRes.json();
    let content = openaiData.choices[0].message.content.trim();

    // Limpar markdown wrapper se houver
    if (content.startsWith("```")) {
      content = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const steps = JSON.parse(content);

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("OpenAI returned invalid format");
    }

    // Escolher sender aleatório
    const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)];

    // Se existia uma sequência parada, deletar
    if (existing) {
      await supabase.from("email_steps").delete().eq("sequence_id", existing.id);
      await supabase.from("email_sequences").delete().eq("id", existing.id);
    }

    // Criar sequência
    const { data: sequence, error: seqError } = await supabase
      .from("email_sequences")
      .insert({
        lead_id,
        status: "active",
        sender_address: sender,
        current_step: 0,
      })
      .select()
      .single();

    if (seqError) throw new Error(`Sequence insert error: ${seqError.message}`);

    // Calcular scheduled_at para cada step
    const now = new Date();
    const emailSteps = steps.map(
      (step: {
        step_number: number;
        subject: string;
        body_html: string;
        send_after_hours: number;
      }) => {
        const scheduledAt = new Date(
          now.getTime() + step.send_after_hours * 60 * 60 * 1000
        );
        return {
          sequence_id: sequence.id,
          step_number: step.step_number,
          subject: step.subject,
          body_html: step.body_html,
          send_after_hours: step.send_after_hours,
          status: "pending",
          scheduled_at: scheduledAt.toISOString(),
        };
      }
    );

    const { error: stepsError } = await supabase
      .from("email_steps")
      .insert(emailSteps);

    if (stepsError)
      throw new Error(`Steps insert error: ${stepsError.message}`);

    console.log(
      `Sequence created for ${business_name}: ${steps.length} emails, sender: ${sender}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        sequence_id: sequence.id,
        steps_count: steps.length,
        sender,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
