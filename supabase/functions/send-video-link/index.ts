import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIDEO_LINK = "https://averoaudio.com/m-vsl";
const FROM_EMAIL = "noreply@innovacall.co";

// ─── Conteúdo multilíngue ───
function getSmsBody(lang: string, pastor_name: string, church_name: string) {
  if (lang === "es") {
    return `Hola ${pastor_name}, aqui esta su enlace para ${church_name}: ${VIDEO_LINK} - Reply STOP to opt out.`;
  }
  if (lang === "pt") {
    return `Oi ${pastor_name}, aqui esta seu link para ${church_name}: ${VIDEO_LINK} - Reply STOP to opt out.`;
  }
  return `Hi ${pastor_name}, here is your link for ${church_name}: ${VIDEO_LINK} - Reply STOP to opt out.`;
}

function getEmailSubject(lang: string, church_name: string) {
  if (lang === "es") return `🎬 Su Enlace de Prueba Gratuita - Avero Audio | ${church_name}`;
  if (lang === "pt") return `🎬 Seu Link de Teste Gratuito - Avero Audio | ${church_name}`;
  return `🎬 Your Free Trial Link - Avero Audio | ${church_name}`;
}

function getEmailHtml(lang: string, pastor_name: string, church_name: string) {
  const i18n: Record<string, any> = {
    en: {
      tagline: "Real-Time Translation for Churches",
      greeting: `Hi Pastor ${pastor_name},`,
      intro: `Thank you for your interest! Here's everything you need to get started with your <strong>FREE 2-hour trial</strong> at ${church_name}:`,
      cta: "🎬 Watch Demo & Start Free Trial",
      whatYouGet: "What you'll get:",
      features: [
        "Real-time translation in 60+ languages",
        "Works on any smartphone — no special equipment",
        "Live text + audio translation during services",
        "Automatic sermon summary with key points & Bible references",
        "2 hours completely FREE — no commitment",
      ],
      footer: "Avero Audio — Helping churches welcome every visitor",
      contact: "Contact us",
      unsub: 'If you no longer wish to receive these emails, simply reply with "unsubscribe".',
    },
    pt: {
      tagline: "Tradução em Tempo Real para Igrejas",
      greeting: `Olá Pastor ${pastor_name},`,
      intro: `Obrigado pelo seu interesse! Aqui está tudo que você precisa para começar o <strong>TESTE GRATUITO de 2 horas</strong> na ${church_name}:`,
      cta: "🎬 Assistir Demo e Iniciar Teste Grátis",
      whatYouGet: "O que você vai ter:",
      features: [
        "Tradução em tempo real em mais de 60 idiomas",
        "Funciona em qualquer celular — sem equipamento especial",
        "Tradução ao vivo em texto + áudio durante os cultos",
        "Resumo automático da pregação com pontos principais e textos bíblicos",
        "2 horas completamente GRÁTIS — sem compromisso",
      ],
      footer: "Avero Audio — Ajudando igrejas a acolher cada visitante",
      contact: "Fale conosco",
      unsub: 'Se não deseja mais receber estes emails, responda com "cancelar".',
    },
    es: {
      tagline: "Traducción en Tiempo Real para Iglesias",
      greeting: `¡Hola Pastor ${pastor_name}!`,
      intro: `¡Gracias por su interés! Aquí tiene todo lo que necesita para comenzar su <strong>PRUEBA GRATUITA de 2 horas</strong> en ${church_name}:`,
      cta: "🎬 Ver Demo e Iniciar Prueba Gratis",
      whatYouGet: "Lo que obtendrá:",
      features: [
        "Traducción en tiempo real en más de 60 idiomas",
        "Funciona en cualquier celular — sin equipo especial",
        "Traducción en vivo en texto + audio durante los servicios",
        "Resumen automático del sermón con puntos clave y referencias bíblicas",
        "2 horas completamente GRATIS — sin compromiso",
      ],
      footer: "Avero Audio — Ayudando a las iglesias a dar la bienvenida a cada visitante",
      contact: "Contáctenos",
      unsub: 'Si no desea recibir más estos correos, responda con "cancelar".',
    },
  };

  const t = i18n[lang] || i18n.en;
  const featuresList = t.features.map((f: string) => `<li>${f}</li>`).join("\n        ");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #ffffff; padding: 0; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">AVERO AUDIO</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0;">${t.tagline}</p>
    </div>
    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">${t.greeting}</p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">${t.intro}</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${VIDEO_LINK}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">${t.cta}</a>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong>${t.whatYouGet}</strong></p>
      <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
        ${featuresList}
      </ul>
    </div>
    <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px;">
      <p>${t.footer}</p>
      <p style="margin-top: 10px;">
        <a href="mailto:noreply@innovacall.co" style="color: #9ca3af;">${t.contact}</a> | ${t.unsub}
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pastor_name, church_name, email, phone, language } = await req.json();
    const lang = (language || "en").toLowerCase().substring(0, 2);
    const results: { sms?: any; email?: any } = {};

    // ─── SMS via Twilio ───
    if (phone) {
      const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
      const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
        throw new Error("Twilio credentials not configured");
      }

      const smsBody = getSmsBody(lang, pastor_name, church_name);

      // Normalize phone to E.164 (mesmo padrão do outro app)
      let digits = phone.replace(/\D/g, "");
      if (digits.length === 10) {
        digits = "1" + digits;
      }
      const normalizedPhone = "+" + digits;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append("To", normalizedPhone);
      formData.append("From", TWILIO_FROM);
      formData.append("Body", smsBody);

      const authHeader = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

      const smsRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
        body: formData.toString(),
      });

      const smsData = await smsRes.json();
      console.log("Twilio FULL response:", JSON.stringify(smsData));
      console.log("Twilio From:", TWILIO_FROM, "To:", phone);
      if (!smsRes.ok) {
        console.error("Twilio error:", JSON.stringify(smsData));
        results.sms = { success: false, error: smsData.message || "SMS failed" };
      } else {
        console.log("SMS sent successfully:", smsData.sid, "status:", smsData.status, "error_code:", smsData.error_code);
        results.sms = { success: true, sid: smsData.sid, status: smsData.status, from: smsData.from, to: smsData.to };
      }
    }

    // ─── Email via Resend ───
    if (email) {
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");

      const subject = getEmailSubject(lang, church_name);
      const htmlBody = getEmailHtml(lang, pastor_name, church_name);

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Avero Audio <${FROM_EMAIL}>`,
          to: [email],
          subject,
          html: htmlBody,
        }),
      });

      const emailData = await emailRes.json();
      if (!emailRes.ok) {
        console.error("Resend error:", JSON.stringify(emailData));
        results.email = { success: false, error: emailData.message || "Email failed" };
      } else {
        console.log("Email sent successfully:", emailData.id);
        results.email = { success: true, id: emailData.id };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
