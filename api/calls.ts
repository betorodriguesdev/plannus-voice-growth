export const config = { runtime: "edge" };

// Amanda's dedicated account
const AMANDA_API_KEY = "key_a05b4b210717e828f48ae1b34853";
const AMANDA_AGENT_ID = "agent_1948bc3e7c0a76ce1952074bce";

async function fetchCalls() {
  const res = await fetch("https://api.retellai.com/v2/list-calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AMANDA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter_criteria: { agent_id: [AMANDA_AGENT_ID] },
      limit: 200,
      sort_order: "descending",
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default async function handler() {
  const calls = await fetchCalls();

  return new Response(JSON.stringify(calls), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
