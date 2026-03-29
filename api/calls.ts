export const config = { runtime: "edge" };

export default async function handler() {
  const res = await fetch("http://187.124.93.72:3099/calls");
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
