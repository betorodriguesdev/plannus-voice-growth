export const config = { runtime: "edge" };

const SMS_URL = "https://fulkylgnohbajlmjjoip.supabase.co/functions/v1/send-sms";
const SMS_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1bGt5bGdub2hiYWpsbWpqb2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTY2MzIsImV4cCI6MjA4OTAzMjYzMn0.8Lft36fmp3HEJ-rIoSlQqat-HMUhErOY_SMyt5UgyTE";

const PLANS: Record<string, { label: string; price: string; link: string }> = {
  essencial: {
    label: "Plano Essencial",
    price: "$97/mês",
    link: "https://buy.stripe.com/7sYbJ27IGa3pbxQb6v8so1Q",
  },
  avancado: {
    label: "Plano Avançado",
    price: "$149/mês",
    link: "https://buy.stripe.com/9B6cN62omcbxeK24I78so1R",
  },
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    // Retell sends: { call: {...}, name: "send_payment_link", arguments: {...} }
    const args = body.arguments || body;
    const { customer_name, customer_phone, plan_type } = args;

    const plan = PLANS[plan_type?.toLowerCase()] || PLANS.essencial;

    // Normalize phone to E.164
    const digits = (customer_phone || "").replace(/\D/g, "");
    const phone = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : customer_phone;

    const firstName = (customer_name || "").split(" ")[0];
    const message = `Oi${firstName ? ` ${firstName}` : ""}! Aqui é a Amanda da Plannus Voice 🤖\n\nSeu link de pagamento — ${plan.label} (${plan.price}):\n${plan.link}\n\nQualquer dúvida é só responder aqui!`;

    const res = await fetch(SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SMS_KEY}`,
        "apikey": SMS_KEY,
      },
      body: JSON.stringify({ to: phone, message }),
    });

    const result = await res.json();

    if (result.success) {
      return new Response(
        JSON.stringify({ result: `Link do ${plan.label} enviado para ${phone}!` }),
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ result: "Erro ao enviar SMS. Tente novamente." }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("[send-payment-link]", err);
    return new Response(
      JSON.stringify({ result: "Erro interno. Tente novamente." }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
