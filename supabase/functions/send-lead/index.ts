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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const leadData = await req.json();
    console.log("Received lead:", JSON.stringify(leadData));

    // ═══ DEDUPLICATION ═══
    const phoneValue = leadData.phone || leadData.telefone;
    // Check by phone number
    if (phoneValue) {
      const { data: existingByPhone } = await supabase
        .from("leads")
        .select("id, church_name")
        .eq("phone", phoneValue)
        .limit(1);

      if (existingByPhone && existingByPhone.length > 0) {
        console.log(`Duplicate found by phone: ${phoneValue} → ${existingByPhone[0].church_name}`);
        return new Response(JSON.stringify({
          success: true,
          duplicate: true,
          existing_id: existingByPhone[0].id,
          match_type: "phone",
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check by church name (fuzzy: lowercase trim)
    const churchNameValue = leadData.church_name || leadData.nome_igreja;
    if (churchNameValue) {
      const { data: existingByName } = await supabase
        .from("leads")
        .select("id, church_name")
        .ilike("church_name", churchNameValue.trim());

      if (existingByName && existingByName.length > 0) {
        console.log(`Duplicate found by church name: ${leadData.church_name} → ${existingByName[0].id}`);
        return new Response(JSON.stringify({
          success: true,
          duplicate: true,
          existing_id: existingByName[0].id,
          match_type: "church_name",
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ═══ BUILD METADATA ═══
    const meta = leadData.metadata || {};
    // If signup_source sent at top level, merge into metadata
    if (leadData.signup_source) {
      meta.signup_source = leadData.signup_source;
    }

    // Derive source from utm_source if not explicitly provided
    let source = leadData.source || "scraper";
    if (meta.signup_source?.utm_source) {
      const utm = meta.signup_source.utm_source.toLowerCase();
      if (utm.includes("scrape") || utm.includes("google") || utm.includes("maps")) {
        source = "scraper";
      } else {
        source = meta.signup_source.utm_source; // e.g. "app", "organic", "referral"
      }
    }

    // ═══ INSERT NEW LEAD ═══
    const { data: newLead, error } = await supabase.from("leads").insert({
      church_name: leadData.church_name || leadData.nome_igreja || leadData.name || null,
      pastor_name: leadData.pastor_name || leadData.pastor || null,
      phone: leadData.phone || leadData.telefone || null,
      email: leadData.email || null,
      website: leadData.website || leadData.site || null,
      city: leadData.city || leadData.cidade || null,
      state: leadData.state || leadData.estado || null,
      source,
      score: leadData.score || 0,
      language: leadData.language || leadData.tipo === "hispanic" ? "es" : "en",
      status: "novo",
      notes: leadData.notes || null,
      metadata: meta,
    }).select().single();

    if (error) {
      console.error("Error inserting lead:", error);
      throw new Error(error.message);
    }

    console.log("Lead inserted:", newLead.id);

    return new Response(JSON.stringify({
      success: true,
      duplicate: false,
      lead_id: newLead.id,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
