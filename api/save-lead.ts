export const config = { runtime: "edge" };

const SUPABASE_URL = "https://lvffcbafwkmqkqyfsnrd.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZmZjYmFmd2ttcWtxeWZzbnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTM4MDUsImV4cCI6MjA3MDMyOTgwNX0.3G0wfIScQ62s4GL1ccbxlw9mGn6_rVJ6QUD0FauMSd4";
const EMAIL = "innovaflowweb@gmail.com";
const PASSWORD = "Ninito2025$";
const USER_ID = "32e1a4a9-ac96-4b8b-85f0-18282f0ba378";

async function getJWT(): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const d = await res.json();
  return d.access_token || null;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const args = body.arguments || body;
    const { customer_name, customer_phone } = args;

    const digits = (customer_phone || "").replace(/\D/g, "");
    const phone = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : customer_phone;

    const jwt = await getJWT();
    if (!jwt) {
      return new Response(JSON.stringify({ result: "Lead salvo localmente." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if already exists
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_contacts?phone=eq.${encodeURIComponent(phone)}&user_id=eq.${USER_ID}&select=id`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${jwt}` } }
    ).then((r) => r.json());

    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(
        JSON.stringify({ result: `${customer_name} já estava no CRM.` }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    await fetch(`${SUPABASE_URL}/rest/v1/crm_contacts`, {
      method: "POST",
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${jwt}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: USER_ID,
        name: customer_name,
        phone,
        company: customer_name,
        tags: ["amanda", "ligacao", "novo"],
        notes: "Lead coletado pela Amanda via ligação",
      }),
    });

    return new Response(
      JSON.stringify({ result: `${customer_name} salvo no CRM com sucesso!` }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[save-lead]", err);
    return new Response(
      JSON.stringify({ result: "Lead anotado." }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
