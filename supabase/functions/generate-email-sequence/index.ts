import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente que personaliza templates de email para cold outreach B2B.

Seu trabalho é ADAPTAR os templates que receber para o nicho e contexto específico do lead. Você deve:

1. Manter TODA a estrutura, tom, e tamanho dos templates — não encurte NADA
2. Substituir as variáveis {{NOME}}, {{EMPRESA}}, {{CIDADE}} etc.
3. ADAPTAR as cenas e dores para serem ESPECÍFICAS do nicho do lead:
   - "painting": cenas com ladder, rolo, tinta, prep work, Sherwin Williams, mask/tape, exterior/interior
   - "landscaping": cenas com cortador, soprador, mowing, mulch, poda, irrigation, lawn care
   - "cleaning": cenas com produtos, schedule de casas, deep cleaning, move-in/move-out, chaves
   - "construction": cenas com material, crew, subcontractor, framing, drywall, concrete
   - "roofing": cenas com telha, calha, storm damage, insurance claim, shingles, flashing
4. Manter o P.S. de cada email
5. O body_html deve usar APENAS tags <p>, <br>, <strong>, <em>
6. NUNCA encurtar o template. Cada email deve manter TODO o conteúdo original.

O PRODUTO sendo vendido é: Plannus Voice — uma Inteligência Artificial que atende as ligações do prestador de serviço em inglês fluente, agenda free estimates no calendário, dispara SMS e email pro cliente, tira objeções, explica os serviços, e grava todas as chamadas. Custa $97/mês (500 min) ou $149/mês (1000 min).

NÃO é um app de gestão. É uma RECEPCIONISTA IA que atende o telefone quando o cara tá trabalhando.

Retorne APENAS um JSON array com 5 objetos, sem explicação, sem markdown wrapper:
[{ "step_number": 1, "subject": "...", "body_html": "...", "send_after_hours": 0 }, ...]`;

function getUserPrompt(
  business_name: string,
  niche: string,
  city: string,
  owner_name?: string
) {
  const nome = owner_name || business_name.split(" ")[0];

  return `Lead: ${nome} — ${business_name} — ${niche} — ${city}

Personalize estes 5 templates para o nicho "${niche}" em "${city}". Adapte TODAS as cenas e dores para serem específicas de quem trabalha com ${niche}. NÃO encurte — mantenha TODO o conteúdo.

===== EMAIL 1 =====
subject: "${nome}, quantas ligações você perdeu essa semana?"
send_after_hours: 0

<p>Oi ${nome},</p>

<p>Me responde com sinceridade: <strong>quantas ligações você perdeu essa semana?</strong></p>

<p>Não precisa contar. Eu já sei a resposta: mais do que gostaria.</p>

<p>Porque eu conheço a sua rotina. Você tá no meio do job — suando, com as mãos ocupadas, focado no serviço — e o celular começa a vibrar no bolso. Às vezes vibra 2, 3 vezes seguidas. Você pensa: <em>"Depois eu ligo de volta."</em></p>

<p>Mas "depois" vira "à noite". E à noite você tá tão acabado que esquece. Ou liga de volta e o cliente não atende mais. Ou pior: quando você finalmente retorna, o cara já fechou com outro — com alguém que simplesmente <strong>atendeu o telefone</strong>.</p>

<p>E sabe qual é a parte que dói mais?</p>

<p>Não é perder o job. É saber que você faz um serviço <strong>melhor</strong> que o cara que pegou. Mas ele pegou porque atendeu. E você não atendeu porque tava trabalhando. A ironia é cruel: <strong>você perde cliente PORQUE tá ocupado trabalhando bem.</strong></p>

<p>E tem outro problema que ninguém fala: o idioma. O americano liga, fala rápido, com sotaque, pergunta coisas específicas — e às vezes você não entende 100%. Não é vergonha nenhuma. Mas você sabe que já perdeu job porque não conseguiu se comunicar direito no telefone. Pessoalmente você resolve, mostra o serviço, o cliente vê a qualidade. Mas no telefone... é outra história.</p>

<p>Agora imagina o seguinte cenário:</p>

<p>O cliente liga. <strong>Alguém atende na hora.</strong> Em inglês perfeito. Com voz profissional. Explica seus serviços, tira as dúvidas, agenda um free estimate no seu calendário, e ainda manda um SMS e email pro cliente confirmando. Tudo isso enquanto você tá no job, focado no que faz de melhor.</p>

<p>Quando você termina o serviço, abre o celular e vê: novo estimate agendado pra quinta-feira, 2pm, com nome, endereço e o que o cliente precisa. <strong>Sem você ter tocado no telefone.</strong></p>

<p>Parece bom demais? Pois é exatamente isso que eu quero te mostrar.</p>

<p>Mas antes, me diz: <strong>quantos jobs você acha que perdeu no último mês por não atender o telefone a tempo?</strong> Se a resposta te incomoda, me responde esse email. Tenho algo que vai mudar isso.</p>

<p>Amanda</p>

<p><strong>P.S.</strong> Um estudo da Invoca mostrou que <strong>62% das pessoas que ligam pra prestador de serviço e não são atendidas nunca mais ligam de volta.</strong> Nunca. Cada ligação perdida é um cliente que foi embora pra sempre. Pensa nisso.</p>

===== EMAIL 2 =====
subject: "O erro de $22.000 que quase quebrou o Renato"
send_after_hours: 48

<p>${nome}, preciso te contar o que aconteceu com o Renato.</p>

<p>O Renato é brasileiro. Trabalha com ${niche} aqui em Massachusetts há 5 anos. Serviço excelente, clientes adoram. Mas ele tinha um problema sério: <strong>não conseguia atender o telefone.</strong></p>

<p>E não era por preguiça. Era porque ele tava TRABALHANDO. O dia inteiro no job, com a mão suja, equipamento ligado, crew pra coordenar. Quando o celular tocava, era impossível parar tudo pra atender.</p>

<p>Ele calculou um dia — e quase caiu pra trás: <strong>eram 6 a 8 ligações perdidas por semana.</strong> Clientes novos que queriam estimate. Clientes antigos que queriam agendar. Indicações que amigos mandavam. Tudo caindo no voicemail. E ele sabia que ninguém deixa mensagem no voicemail em 2026.</p>

<p>Aí ele fez a conta: os jobs dele iam de $3.000 a $25.000. Se ele perde 2-3 estimates grandes por mês só por não atender o telefone... <strong>são $10.000, $15.000, às vezes $20.000 por mês indo embora.</strong> Por ano? Pode passar fácil de <strong>$100.000 perdidos</strong>. Não porque o serviço era ruim. Porque ninguém atendeu a droga do telefone.</p>

<p>A esposa dele falou: <em>"Contrata alguém pra atender."</em> Ele pesquisou. Uma recepcionista meio período? $1.500/mês no mínimo. Answering service americano? $300-500/mês e o atendimento é robótico, genérico, não sabe nada do serviço dele.</p>

<p>Foi aí que alguém mostrou pra ele uma Inteligência Artificial que mudou tudo.</p>

<p>Não é robô. Não é "aperte 1 pra isto, 2 pra aquilo". É uma IA que <strong>conversa de verdade</strong>. Em inglês fluente e natural. Que sabe explicar os serviços do Renato, que responde perguntas, que tira objeções, que agenda free estimate direto no calendário dele, e ainda <strong>manda SMS e email pro cliente confirmando o horário.</strong></p>

<p>O Renato ativa. No primeiro dia, a IA atende 3 ligações que ele teria perdido. Uma delas vira um job de $8.500.</p>

<p>Em 30 dias:</p>

<p>→ A IA atendeu 47 ligações<br>→ Agendou 12 free estimates<br>→ 8 viraram jobs<br>→ Faturamento extra: <strong>$22.000 em um mês</strong><br>→ Ele não perdeu UM job por ligação não atendida</p>

<p>E o custo disso tudo? <strong>$97 por mês.</strong></p>

<p>Quer saber que IA é essa? Me responde <strong>"quero"</strong> que eu te conto tudo.</p>

<p>Amanda</p>

<p><strong>P.S.</strong> Sabe o que o Renato me disse? <em>"Amanda, eu pagava $97/mês e voltava $15.000-20.000. É o melhor investimento que já fiz no meu negócio."</em> E a esposa? Parou de reclamar e começou a ajudar a administrar os novos clientes. 😄</p>

===== EMAIL 3 =====
subject: "Sua nova recepcionista fala inglês perfeito (e custa $3/dia)"
send_after_hours: 120

<p>${nome}, lembra do Renato que te contei?</p>

<p>A IA que ele usa se chama <strong>Plannus Voice</strong>.</p>

<p>Mas deixa eu te explicar o que ela FAZ de verdade, porque não é o que você tá pensando.</p>

<p>Não é aquele robozinho chato de "sua ligação é importante pra nós". Não é menu de opções. Não é gravação. É uma <strong>inteligência artificial que conversa como gente de verdade.</strong></p>

<p>Funciona assim:</p>

<p><strong>1. Cliente liga pro seu número.</strong> Você tá no job e não pode atender? Sem problema. A Plannus Voice atende. Em inglês fluente e natural. O cliente nem percebe que é IA.</p>

<p><strong>2. A IA conversa com o cliente.</strong> Pergunta o que ele precisa. Explica seus serviços. Tira dúvidas. Se o cara pergunta "vocês fazem exterior?" ou "qual a área que vocês atendem?" — ela responde. Com confiança. Sem gaguejar. Sem sotaque.</p>

<p><strong>3. Agenda o free estimate.</strong> A IA olha seu calendário e oferece horários disponíveis. O cliente escolhe. <strong>Pronto — estimate agendado.</strong> Sem você pegar no celular.</p>

<p><strong>4. Dispara SMS + email pro cliente.</strong> Na hora que agenda, o cliente recebe uma confirmação por SMS e por email. Profissional. Com seu nome, data, horário. O americano pensa: <em>"Esse cara tem estrutura."</em></p>

<p><strong>5. Grava tudo.</strong> Cada ligação fica gravada no app. Você pode ouvir depois — saber exatamente o que o cliente pediu, como a conversa foi, o que foi combinado. Zero chance de perder informação.</p>

<p>E sabe quanto custa?</p>

<p>→ <strong>$97/mês</strong> com 500 minutos (dá pra atender uns 100-150 ligações)<br>→ <strong>$149/mês</strong> com 1000 minutos pra quem recebe mais volume</p>

<p>Faz a conta: $97 dividido por 30 dias = <strong>$3,23 por dia.</strong> Menos que um café no Dunkin' Donuts. Pra ter uma recepcionista que fala inglês perfeito, atende 24 horas, nunca falta, nunca reclama, e <strong>nunca perde uma ligação.</strong></p>

<p>Mais de 40 empresas brasileiras já usam. E a média de retorno é de <strong>10x o investimento</strong> no primeiro mês.</p>

<p>Quer ver a Plannus Voice funcionando? Me manda um <strong>"quero"</strong> e eu te mostro em 15 minutos.</p>

<p>Amanda</p>

<p><strong>P.S.</strong> O Marcos, que faz ${niche} em Boston, me ligou semana passada rindo: <em>"Amanda, ontem a IA atendeu um cliente às 7 da noite. Eu tava jantando com a família. Quando vi, já tinha um estimate agendado pra sexta. O cara fechou um job de $2.300."</em> Enquanto ele jantava. Pensa nisso.</p>

===== EMAIL 4 =====
subject: "Guardei uma vaga pra ${business_name}"
send_after_hours: 192

<p>${nome}, essa semana eu te contei:</p>

<p>→ Como você perde milhares de dólares por mês por ligações não atendidas<br>→ Como o Renato recuperou mais de $6.000 no primeiro mês<br>→ Como a Plannus Voice funciona na prática</p>

<p>Agora eu quero te fazer uma proposta. Mas antes, coloca em perspectiva:</p>

<p>→ Contratar uma <strong>recepcionista</strong> que fale inglês: <strong>$2.000-3.000/mês</strong>. E ela só trabalha horário comercial, falta quando quer, e não sabe explicar seu serviço direito.</p>

<p>→ Um <strong>answering service americano</strong>: <strong>$300-500/mês</strong>. Atendimento robótico, genérico, só anota recado. Não agenda nada, não tira dúvida, não converte.</p>

<p>→ <strong>Plannus Voice</strong>: <strong>$97/mês.</strong> Atende 24/7. Inglês perfeito. Conhece seus serviços. Agenda estimate. Manda SMS e email. Grava tudo. Nunca falta. Nunca reclama. E <strong>converte ligação em job.</strong></p>

<p>A conta é simples: se a IA te trouxer <strong>UM job por mês</strong> que você teria perdido, ela já se pagou 5x, 10x.</p>

<p>Eu tenho dois planos:</p>

<p>→ <strong>Essencial — $97/mês</strong> (500 minutos): perfeito pra quem recebe 5-10 ligações por dia<br>→ <strong>Avançado — $149/mês</strong> (1000 minutos): pra quem tem volume maior de chamadas</p>

<p><strong>Como funciona o processo:</strong></p>

<p>1. Você escolhe seu plano e assina pelo link abaixo<br>2. Na hora você recebe um email com um formulário simples pra preencher: nome da empresa, serviços que oferece, área de atendimento, horários disponíveis pra free estimates<br>3. Minha equipe configura sua IA personalizada — treinada com as informações do SEU negócio<br>4. <strong>Em até 5 dias sua IA tá pronta e atendendo.</strong> Você configura seus horários disponíveis no app e pronto — nunca mais perde uma ligação.</p>

<p>É só clicar no plano que faz sentido pra você:</p>

<p>→ <strong><a href="https://buy.stripe.com/7sYbJ27IGa3pbxQb6v8so1Q">Quero o plano Essencial — $97/mês (500 min)</a></strong></p>

<p>→ <strong><a href="https://buy.stripe.com/9B6cN62omcbxeK24I78so1R">Quero o plano Avançado — $149/mês (1000 min)</a></strong></p>

<p>Mas preciso ser honesta: <strong>eu só configuro 5 IAs novas por semana.</strong> Porque cada uma é personalizada — treinada com os serviços, preços e área de atendimento de cada empresa. Não é template genérico. É IA feita sob medida pro SEU negócio.</p>

<p>Se tiver qualquer dúvida antes de assinar, me responde esse email ou me chama no WhatsApp: <strong>(508) 203-9587</strong>. Pode ligar também — a Amanda (a IA!) atende e te explica tudo. Assim você já vê como funciona na prática. 😉</p>

<p>Amanda</p>

<p><strong>P.S.</strong> Sem contrato. Sem fidelidade. Cancela quando quiser com um clique. Se no primeiro mês a IA não trouxer pelo menos UM job que pague o investimento, eu te devolvo o dinheiro. Simples assim. Mas entre nós? Nunca ninguém pediu reembolso. Porque a matemática não mente.</p>

===== EMAIL 5 =====
subject: "Última mensagem, ${nome}"
send_after_hours: 288

<p>${nome},</p>

<p>Essa é minha última mensagem. Prometo que não vou mais encher teu saco. 😄</p>

<p>Mas antes de ir, me deixa pintar dois cenários pra você:</p>

<p><strong>Cenário 1 — Nada muda:</strong></p>

<p>Amanhã seu celular vai tocar no meio do job. Você não vai poder atender. O cliente vai ligar pra outro. Na semana que vem, a mesma coisa. No mês que vem, a mesma coisa. Aquele americano que ligou às 6 da tarde quando você tava no trânsito? Foi embora. A indicação que seu amigo mandou e ligou no sábado? Caiu no voicemail. O cara que queria um job grande? Fechou com o concorrente que atendeu na hora.</p>

<p>No final do ano, você vai ter perdido <strong>$20.000, $30.000, talvez mais</strong> — em jobs que eram seus, com clientes que queriam VOCÊ. Mas que foram embora porque ninguém atendeu o telefone.</p>

<p><strong>Cenário 2 — Plannus Voice:</strong></p>

<p>Amanhã seu celular toca no meio do job. A IA atende. Em inglês perfeito. Explica seu serviço. Agenda um estimate pra quinta-feira. Manda SMS pro cliente. Quando você termina o job e abre o celular, tá lá: nome, endereço, horário, o que o cara precisa. Você ouve a gravação, vê que foi uma conversa profissional, e pensa: <em>"Caramba, isso é real."</em></p>

<p>No final do mês, você percebe que não perdeu NENHUMA ligação. Que tem mais estimates do que consegue fazer. Que tá escolhendo os jobs, não implorando por eles.</p>

<p><strong>A diferença entre esses dois cenários? $97 por mês e 5 dias pra configurar.</strong></p>

<p>Se você quiser mudar do cenário 1 pro cenário 2, é só escolher seu plano:</p>

<p>→ <strong><a href="https://buy.stripe.com/7sYbJ27IGa3pbxQb6v8so1Q">Plano Essencial — $97/mês (500 min)</a></strong><br>→ <strong><a href="https://buy.stripe.com/9B6cN62omcbxeK24I78so1R">Plano Avançado — $149/mês (1000 min)</a></strong></p>

<p>Assinou? Em minutos você recebe um formulário simples por email. Preenche os dados da sua empresa — serviços, área, horários — e em <strong>até 5 dias sua IA tá pronta e atendendo.</strong></p>

<p>Se preferir tirar dúvida antes, me chama no WhatsApp: <strong>(508) 203-9587</strong>. A Amanda (a IA) atende e te explica tudo — assim você já vê como funciona.</p>

<p>Se não for agora, tudo bem. Esse email tá sempre aberto. Me responde <strong>"quero conversar"</strong> quando estiver pronto.</p>

<p>Te desejo tudo de bom, ${nome}. Sucesso aí na batalha.</p>

<p>Amanda</p>

<p><strong>P.S.</strong> O Renato me disse: <em>"Amanda, meu arrependimento é não ter começado antes. Cada mês sem a IA era dinheiro jogado fora. Não por preguiça — por teimosia."</em> Não cometa o mesmo erro. Mas a decisão é sua. Fica bem. ❤️</p>

=====

Retorne o JSON array com os 5 emails personalizados pro nicho "${niche}". Adapte as cenas e dores mas MANTENHA todo o conteúdo. Não encurte nada.
[
  { "step_number": 1, "subject": "...", "body_html": "...", "send_after_hours": 0 },
  { "step_number": 2, "subject": "...", "body_html": "...", "send_after_hours": 48 },
  { "step_number": 3, "subject": "...", "body_html": "...", "send_after_hours": 120 },
  { "step_number": 4, "subject": "...", "body_html": "...", "send_after_hours": 192 },
  { "step_number": 5, "subject": "...", "body_html": "...", "send_after_hours": 288 }
]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY)
      throw new Error("OPENAI_API_KEY not configured");

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

    // Checar se já existe sequência ativa
    const { data: existing } = await supabase
      .from("email_sequences")
      .select("id, status")
      .eq("contact_id", lead_id)
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
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 10000,
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

    // Limpar markdown wrapper
    if (content.startsWith("```")) {
      content = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    const steps = JSON.parse(content);

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("OpenAI returned invalid format");
    }

    // Wrap body_html with smaller font
    for (const step of steps) {
      step.body_html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${step.body_html}</div>`;
    }

    // Sender
    const sender = "Amanda | Plannus Voice <amanda@innovacall.co>";

    // Se existia uma sequência parada, deletar
    if (existing) {
      await supabase
        .from("email_steps")
        .delete()
        .eq("sequence_id", existing.id);
      await supabase
        .from("email_sequences")
        .delete()
        .eq("id", existing.id);
    }

    // Criar sequência
    const { data: sequence, error: seqError } = await supabase
      .from("email_sequences")
      .insert({
        contact_id: lead_id,
        status: "active",
        sender_address: sender,
        current_step: 0,
      })
      .select()
      .single();

    if (seqError)
      throw new Error(`Sequence insert error: ${seqError.message}`);

    // Calcular scheduled_at
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
      `Sequence created for ${business_name}: ${steps.length} emails`
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
