import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MCP_TOKEN = "avero-2025$";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const app = new Hono();

app.use("/*", async (c, next) => {
  const url = new URL(c.req.url);
  const token = url.searchParams.get("token");
  if (token && token !== MCP_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

const retellApiKey = Deno.env.get("RETELL_API_KEY")!;
const retellAgentId = Deno.env.get("RETELL_AGENT_ID")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RETELL_BASE = "https://api.retellai.com";

async function retellFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RETELL_BASE}${path}`, {
    ...options,
    headers: { "Authorization": `Bearer ${retellApiKey}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Retell API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function getEventColor(t: string) {
  return ({ ai_call: "#8b5cf6", follow_up: "#3b82f6", demo: "#10b981", email: "#f59e0b", ai_call_retry: "#ef4444" } as any)[t] || "#6b7280";
}

const mcp = new McpServer({ name: "retell-ai-mcp", version: "1.0.0" });

// ═══════════════════════════════════════════════════
// TOOLS DO AGENTE RETELL (conforme prompt oficial)
// ═══════════════════════════════════════════════════

// 1. send_video_and_link — Envia SMS + email com vídeo e link do teste gratuito
mcp.tool("send_video_and_link", {
  description: "Envia SMS e email com o vídeo demonstrativo e link do teste gratuito para o pastor. REGRA CRÍTICA: só enviar após o pastor ditar explicitamente o número de destino durante a ligação. Nunca assumir o número discado.",
  inputSchema: {
    type: "object" as const,
    properties: {
      pastor_name: { type: "string" as const, description: "Nome do pastor (como ele se apresentou na ligação)" },
      church_name: { type: "string" as const, description: "Nome da igreja do pastor" },
      email: { type: "string" as const, description: "Email do PASTOR (somente se ele informar ou pedir envio por email)." },
      phone: { type: "string" as const, description: "Telefone informado pelo PASTOR durante a ligação para receber o link. Nunca assumir o número discado." },
      phone_confirmed_in_call: { type: "boolean" as const, description: "true apenas quando o pastor confirmou explicitamente o número durante a conversa." },
      language: { type: "string" as const, enum: ["pt", "en", "es"], description: "Idioma da conversa: pt (português), en (inglês) ou es (espanhol)." },
    },
    required: ["phone", "phone_confirmed_in_call"],
  },
  handler: async (args: { pastor_name?: string; church_name?: string; email?: string; phone: string; phone_confirmed_in_call: boolean; language?: string }) => {
    try {
      if (!args.phone_confirmed_in_call) {
        return { content: [{ type: "text" as const, text: "Erro: não posso enviar sem número confirmado pelo pastor durante a ligação." }] };
      }

      const digitsOnly = (args.phone || "").replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        return { content: [{ type: "text" as const, text: "Erro: telefone inválido. Confirme e envie o número completo informado pelo pastor." }] };
      }

      // Buscar dados do lead no CRM apenas para complementar nome/igreja/email
      const { data: lead } = await supabase.from("leads").select("*").eq("phone", args.phone).single();
      
      const pastorName = args.pastor_name || lead?.pastor_name || "Pastor";
      const churchName = args.church_name || lead?.church_name || "Igreja";
      const email = args.email || lead?.email;
      const phone = args.phone;

      console.log(`Enviando video link para: pastor=${pastorName}, igreja=${churchName}, email=${email}, phone=${phone}`);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-video-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          pastor_name: pastorName,
          church_name: churchName,
          email: email || null,
          phone: phone,
          language: args.language || "en",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      if (lead?.id) {
        await supabase.from("leads").update({
          status: "link_enviado",
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Video e link enviados com sucesso! SMS para ${phone}${email ? ` e email para ${email}` : ''}.`, results: data.results }) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Erro ao enviar vídeo e link: ${(e as Error).message}` }] };
    }
  },
});

// 2. log_call_attempt — Registra tentativa de ligação
mcp.tool("log_call_attempt", {
  description: "Registra o resultado de uma tentativa de ligação no CRM. Usar ao final de TODA tentativa, atendida ou não.",
  inputSchema: {
    type: "object" as const,
    properties: {
      pastor_name: { type: "string" as const, description: "Nome do pastor" },
      church_name: { type: "string" as const, description: "Nome da igreja" },
      phone: { type: "string" as const, description: "Telefone ligado" },
      status: { type: "string" as const, enum: ["answered", "no_answer", "busy", "voicemail", "max_attempts_reached", "callback_scheduled", "interested", "not_interested"], description: "Resultado da tentativa" },
      notes: { type: "string" as const, description: "Observações sobre a ligação" },
      duration_seconds: { type: "number" as const, description: "Duração em segundos" },
      attempt_number: { type: "number" as const, description: "Número da tentativa (1, 2 ou 3)" },
    },
    required: ["phone", "status"],
  },
  handler: async (args: any) => {
    try {
      // Find or create lead
      let lead;
      const { data: existing } = await supabase.from("leads").select("*").eq("phone", args.phone).single();
      if (existing) {
        lead = existing;
      } else {
        const { data: created } = await supabase.from("leads").insert({
          pastor_name: args.pastor_name || null,
          church_name: args.church_name || null,
          phone: args.phone,
          status: "novo",
          source: "retell_ai",
        }).select().single();
        lead = created;
      }

      if (!lead) throw new Error("Could not find or create lead");

      // Map status
      let leadStatus = lead.status;
      if (args.status === "answered" || args.status === "interested") leadStatus = "falou_com_pastor";
      else if (args.status === "not_interested") leadStatus = "sem_interesse";
      else if (args.status === "max_attempts_reached") leadStatus = "sem_resposta";
      else if (args.status === "no_answer" || args.status === "busy" || args.status === "voicemail") leadStatus = "sem_resposta_parcial";
      else if (args.status === "callback_scheduled") leadStatus = "callback_agendado";

      const attemptNum = args.attempt_number || (lead.call_attempts || 0) + 1;

      // Log the call
      await supabase.from("call_logs").insert({
        lead_id: lead.id,
        agent_id: retellAgentId,
        call_status: args.status,
        direction: "outbound",
        to_number: args.phone,
        attempt_number: attemptNum,
        duration_seconds: args.duration_seconds || null,
        summary: args.notes || null,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      });

      // Update lead
      await supabase.from("leads").update({
        status: leadStatus,
        call_attempts: attemptNum,
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", lead.id);

      // Auto-schedule retry if no_answer and under 3 attempts
      if ((args.status === "no_answer" || args.status === "busy" || args.status === "voicemail") && attemptNum < 3) {
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + 2);
        await supabase.from("calendar_events").insert({
          title: `Re-tentativa: ${lead.church_name || lead.pastor_name || args.phone}`,
          event_type: "ai_call_retry",
          lead_id: lead.id,
          start_time: retryDate.toISOString(),
          status: "scheduled",
          color: "#ef4444",
        });
        await supabase.from("leads").update({ next_follow_up_at: retryDate.toISOString() }).eq("id", lead.id);
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead_id: lead.id, status: leadStatus, attempt: attemptNum }) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] };
    }
  },
});

// 3. schedule_callback — Agenda retorno de ligação
mcp.tool("schedule_callback", {
  description: "Agenda um retorno de ligação quando o pastor pede para ligar em outro horário. Registra data/hora preferida.",
  inputSchema: {
    type: "object" as const,
    properties: {
      pastor_name: { type: "string" as const, description: "Nome do pastor" },
      church_name: { type: "string" as const, description: "Nome da igreja" },
      phone: { type: "string" as const, description: "Telefone" },
      callback_date: { type: "string" as const, description: "Data preferida (ISO ou descritiva, ex: 'segunda-feira às 14h')" },
      callback_time: { type: "string" as const, description: "Horário preferido" },
      notes: { type: "string" as const, description: "Observações" },
    },
    required: ["phone", "callback_date"],
  },
  handler: async (args: any) => {
    try {
      // Find or create lead
      let lead;
      const { data: existing } = await supabase.from("leads").select("*").eq("phone", args.phone).single();
      if (existing) {
        lead = existing;
      } else {
        const { data: created } = await supabase.from("leads").insert({
          pastor_name: args.pastor_name || null,
          church_name: args.church_name || null,
          phone: args.phone,
          status: "callback_agendado",
          source: "retell_ai",
        }).select().single();
        lead = created;
      }

      if (!lead) throw new Error("Could not find or create lead");

      // Parse callback datetime
      let startTime: string;
      try {
        const d = new Date(args.callback_date);
        if (args.callback_time) {
          const [h, m] = args.callback_time.replace(/[^0-9:]/g, '').split(':');
          d.setHours(parseInt(h) || 14, parseInt(m) || 0);
        }
        startTime = d.toISOString();
      } catch {
        // Fallback: tomorrow at 2pm
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        startTime = d.toISOString();
      }

      await supabase.from("calendar_events").insert({
        title: `Callback: ${args.pastor_name || lead.pastor_name || args.phone} - ${args.church_name || lead.church_name || ""}`,
        description: args.notes || `Pastor pediu para ligar de volta em ${args.callback_date} ${args.callback_time || ""}`,
        event_type: "ai_call",
        lead_id: lead.id,
        start_time: startTime,
        status: "scheduled",
        color: "#8b5cf6",
      });

      await supabase.from("leads").update({
        status: "callback_agendado",
        next_follow_up_at: startTime,
        updated_at: new Date().toISOString(),
      }).eq("id", lead.id);

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead_id: lead.id, callback_at: startTime }) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] };
    }
  },
});

// 4. update_crm_contact — Atualiza dados do contato no CRM
mcp.tool("update_crm_contact", {
  description: "Atualiza ou cria o contato no CRM com nome, igreja, email e telefone. Usar após capturar ou confirmar dados do pastor.",
  inputSchema: {
    type: "object" as const,
    properties: {
      pastor_name: { type: "string" as const, description: "Nome do pastor" },
      church_name: { type: "string" as const, description: "Nome da igreja" },
      email: { type: "string" as const, description: "Email do pastor" },
      phone: { type: "string" as const, description: "Telefone do pastor" },
      city: { type: "string" as const, description: "Cidade" },
      state: { type: "string" as const, description: "Estado" },
      notes: { type: "string" as const, description: "Notas adicionais" },
    },
    required: ["phone"],
  },
  handler: async (args: any) => {
    try {
      const { data: existing } = await supabase.from("leads").select("*").eq("phone", args.phone).single();

      const updateData: any = { updated_at: new Date().toISOString() };
      if (args.pastor_name) updateData.pastor_name = args.pastor_name;
      if (args.church_name) updateData.church_name = args.church_name;
      if (args.email) updateData.email = args.email;
      if (args.city) updateData.city = args.city;
      if (args.state) updateData.state = args.state;
      if (args.notes) updateData.notes = args.notes;

      let lead;
      if (existing) {
        const { data } = await supabase.from("leads").update(updateData).eq("id", existing.id).select().single();
        lead = data;
      } else {
        const { data } = await supabase.from("leads").insert({
          ...updateData,
          phone: args.phone,
          status: "novo",
          source: "retell_ai",
        }).select().single();
        lead = data;
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead }) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] };
    }
  },
});

// ═══════════════════════════════════════════════════
// TOOLS INTERNAS DO SISTEMA
// ═══════════════════════════════════════════════════

// Create Call (outbound individual)
mcp.tool("create_call", {
  description: "Inicia uma ligação outbound via Retell AI para um lead",
  inputSchema: {
    type: "object" as const,
    properties: {
      lead_id: { type: "string" as const, description: "UUID do lead" },
      phone_number: { type: "string" as const, description: "Número E.164" },
      first_sentence: { type: "string" as const, description: "Primeira frase do agente" },
    },
    required: ["lead_id", "phone_number"],
  },
  handler: async (args: { lead_id: string; phone_number: string; first_sentence?: string }) => {
    try {
      const fromNumber = "+15089012335";
      const { data: lead } = await supabase.from("leads").select("*").eq("id", args.lead_id).single();
      const pastorName = lead?.pastor_name || "Pastor";
      const churchName = lead?.church_name || "";
      const callData = await retellFetch("/v2/create-phone-call", {
        method: "POST",
        body: JSON.stringify({
          agent_id: retellAgentId,
          from_number: fromNumber,
          to_number: args.phone_number,
          ...(args.first_sentence && { first_sentence: args.first_sentence }),
          retell_llm_dynamic_variables: {
            contact_name: pastorName,
            church_name: churchName,
          },
          metadata: { lead_id: args.lead_id },
        }),
      });
      const attempts = (lead?.call_attempts || 0) + 1;
      await supabase.from("leads").update({ call_attempts: attempts, last_contact_at: new Date().toISOString(), status: "em_contato", updated_at: new Date().toISOString() }).eq("id", args.lead_id);
      await supabase.from("call_logs").insert({ retell_call_id: callData.call_id, lead_id: args.lead_id, agent_id: retellAgentId, call_status: "initiated", direction: "outbound", to_number: args.phone_number, attempt_number: attempts, started_at: new Date().toISOString() });
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, call_id: callData.call_id, contact_name: pastorName }) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Batch Call
mcp.tool("batch_call", {
  description: "Ligações em lote para múltiplos leads",
  inputSchema: {
    type: "object" as const,
    properties: {
      lead_ids: { type: "array" as const, items: { type: "string" as const }, description: "UUIDs" },
      filter_status: { type: "string" as const, description: "Filtrar por status" },
      max_calls: { type: "number" as const, description: "Max (default 10)" },
    },
    required: [] as string[],
  },
  handler: async (args: any) => {
    try {
      const max = args.max_calls || 10;
      let leads;
      if (args.lead_ids?.length) { const { data } = await supabase.from("leads").select("*").in("id", args.lead_ids).limit(max); leads = data; }
      else if (args.filter_status) { const { data } = await supabase.from("leads").select("*").eq("status", args.filter_status).lt("call_attempts", 3).limit(max); leads = data; }
      else { const { data } = await supabase.from("leads").select("*").in("status", ["novo", "sem_resposta"]).lt("call_attempts", 3).limit(max); leads = data; }
      if (!leads?.length) return { content: [{ type: "text" as const, text: "Nenhum lead." }] };
      const results = [];
      for (const lead of leads) {
        if (!lead.phone) { results.push({ lead_id: lead.id, status: "skipped" }); continue; }
        try {
          const fromNumber = "+15089012335";
          const cd = await retellFetch("/v2/create-phone-call", { method: "POST", body: JSON.stringify({ agent_id: retellAgentId, from_number: fromNumber, to_number: lead.phone, retell_llm_dynamic_variables: { contact_name: lead.pastor_name || "Pastor", church_name: lead.church_name || "" }, metadata: { lead_id: lead.id } }) });
          await supabase.from("call_logs").insert({ retell_call_id: cd.call_id, lead_id: lead.id, agent_id: retellAgentId, call_status: "initiated", direction: "outbound", to_number: lead.phone, attempt_number: (lead.call_attempts||0)+1, started_at: new Date().toISOString() });
          await supabase.from("leads").update({ call_attempts: (lead.call_attempts||0)+1, last_contact_at: new Date().toISOString(), status: "em_contato", updated_at: new Date().toISOString() }).eq("id", lead.id);
          results.push({ lead_id: lead.id, call_id: cd.call_id, status: "initiated" });
          await new Promise(r => setTimeout(r, 5000));
        } catch (err) { results.push({ lead_id: lead.id, status: "error", error: (err as Error).message }); }
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ total: leads.length, results }) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Get Call Logs
mcp.tool("get_call_logs", {
  description: "Busca logs de chamadas",
  inputSchema: { type: "object" as const, properties: { lead_id: { type: "string" as const }, status: { type: "string" as const }, limit: { type: "number" as const } }, required: [] as string[] },
  handler: async (args: any) => {
    let q = supabase.from("call_logs").select("*, leads(church_name, pastor_name)").order("created_at", { ascending: false }).limit(args.limit || 50);
    if (args.lead_id) q = q.eq("lead_id", args.lead_id);
    if (args.status) q = q.eq("call_status", args.status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Erro: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ total: data?.length || 0, logs: data }) }] };
  },
});

// Get Retell Call
mcp.tool("get_retell_call", {
  description: "Detalhes de chamada da API Retell",
  inputSchema: { type: "object" as const, properties: { call_id: { type: "string" as const } }, required: ["call_id"] },
  handler: async (args: { call_id: string }) => {
    try { const data = await retellFetch(`/v2/get-call/${args.call_id}`); return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }; }
    catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Dashboard Stats
mcp.tool("get_dashboard_stats", {
  description: "Estatísticas gerais",
  inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  handler: async () => {
    try {
      const [ld, cd, ed] = await Promise.all([
        supabase.from("leads").select("id, status, call_attempts, score"),
        supabase.from("call_logs").select("id, call_status, duration_seconds, sentiment"),
        supabase.from("calendar_events").select("id, event_type, status").gte("start_time", new Date().toISOString()),
      ]);
      const l = ld.data||[], c = cd.data||[], e = ed.data||[];
      return { content: [{ type: "text" as const, text: JSON.stringify({
        leads: { total: l.length, by_status: l.reduce((a:any,x:any)=>{a[x.status||"?"]=((a[x.status||"?"])||0)+1;return a;},{}) },
        calls: { total: c.length, by_status: c.reduce((a:any,x:any)=>{a[x.call_status||"?"]=((a[x.call_status||"?"])||0)+1;return a;},{}) },
        upcoming_events: e.length,
      }) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});
// Get Agent Config
mcp.tool("get_agent_config", {
  description: "Busca configuração completa do agente Retell (prompt, voz, etc)",
  inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  handler: async () => {
    try {
      const data = await retellFetch(`/get-agent/${retellAgentId}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Get LLM Config (prompt)
mcp.tool("get_llm_config", {
  description: "Busca o prompt/configuração do LLM do agente Retell (general_prompt, state prompts, tools)",
  inputSchema: { type: "object" as const, properties: { llm_id: { type: "string" as const, description: "LLM ID (se omitido, busca do agente)" } }, required: [] as string[] },
  handler: async (args: any) => {
    try {
      let llmId = args.llm_id;
      if (!llmId) {
        const agent = await retellFetch(`/get-agent/${retellAgentId}`);
        llmId = agent.response_engine?.llm_id;
      }
      if (!llmId) throw new Error("LLM ID não encontrado");
      const data = await retellFetch(`/get-retell-llm/${llmId}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Update LLM Prompt
mcp.tool("update_llm_prompt", {
  description: "Atualiza o prompt do LLM do agente Retell. Campos: general_prompt (prompt geral), begin_message (mensagem inicial).",
  inputSchema: {
    type: "object" as const,
    properties: {
      general_prompt: { type: "string" as const, description: "Prompt geral do agente (system prompt)" },
      begin_message: { type: "string" as const, description: "Mensagem inicial quando a chamada conecta" },
      llm_id: { type: "string" as const, description: "LLM ID (se omitido, busca do agente)" },
    },
    required: [] as string[],
  },
  handler: async (args: any) => {
    try {
      let llmId = args.llm_id;
      if (!llmId) {
        const agent = await retellFetch(`/get-agent/${retellAgentId}`);
        llmId = agent.response_engine?.llm_id;
      }
      if (!llmId) throw new Error("LLM ID não encontrado");
      
      const updateBody: any = {};
      if (args.general_prompt) updateBody.general_prompt = args.general_prompt;
      if (args.begin_message) updateBody.begin_message = args.begin_message;
      
      const data = await retellFetch(`/update-retell-llm/${llmId}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, updated_fields: Object.keys(updateBody), llm_id: llmId }) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Update Agent Voice
mcp.tool("update_agent_voice", {
  description: "Atualiza a voz ou configurações do agente Retell (voice_id, language, interruption_sensitivity, etc)",
  inputSchema: {
    type: "object" as const,
    properties: {
      voice_id: { type: "string" as const, description: "ID da voz (ex: minimax-Marissa, eleven_turbo_v2, etc)" },
      language: { type: "string" as const, description: "Idioma: multi, en-US, pt-BR, es, etc" },
      interruption_sensitivity: { type: "number" as const, description: "Sensibilidade a interrupção (0-1)" },
    },
    required: [] as string[],
  },
  handler: async (args: any) => {
    try {
      const updateBody: any = {};
      if (args.voice_id) updateBody.voice_id = args.voice_id;
      if (args.language) updateBody.language = args.language;
      if (args.interruption_sensitivity !== undefined) updateBody.interruption_sensitivity = args.interruption_sensitivity;
      
      const data = await retellFetch(`/update-agent/${retellAgentId}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, updated_fields: Object.keys(updateBody), agent_name: data.agent_name }) }] };
    } catch (e) { return { content: [{ type: "text" as const, text: `Erro: ${(e as Error).message}` }] }; }
  },
});

// Transport
const transport = new StreamableHttpTransport();
transport.bind(mcp);
app.all("/*", async (c) => transport.handleRequest(c.req.raw));
Deno.serve(app.fetch);
