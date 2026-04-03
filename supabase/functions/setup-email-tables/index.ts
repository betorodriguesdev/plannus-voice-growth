import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Create email_sequences table
    const { error: e1 } = await supabase.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS email_sequences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID,
          status TEXT NOT NULL DEFAULT 'active',
          sender_address TEXT NOT NULL,
          current_step INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          stopped_reason TEXT
        );
      `,
    });

    // Try direct SQL via pg if rpc doesn't work
    // Fallback: use raw SQL through the REST API
    const results: string[] = [];

    const sqls = [
      `CREATE TABLE IF NOT EXISTS email_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID,
        status TEXT NOT NULL DEFAULT 'active',
        sender_address TEXT NOT NULL,
        current_step INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        stopped_reason TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS email_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
        step_number INT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        send_after_hours INT NOT NULL DEFAULT 48,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        resend_email_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS email_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        step_id UUID REFERENCES email_steps(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE email_steps ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE email_events ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_sequences' AND policyname = 'allow_all_email_sequences') THEN
          CREATE POLICY allow_all_email_sequences ON email_sequences FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_steps' AND policyname = 'allow_all_email_steps') THEN
          CREATE POLICY allow_all_email_steps ON email_steps FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_events' AND policyname = 'allow_all_email_events') THEN
          CREATE POLICY allow_all_email_events ON email_events FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$`,
      `CREATE INDEX IF NOT EXISTS idx_email_steps_pending ON email_steps(status, scheduled_at) WHERE status = 'pending'`,
      `CREATE INDEX IF NOT EXISTS idx_email_steps_resend_id ON email_steps(resend_email_id) WHERE resend_email_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_email_events_step ON email_events(step_id)`,
    ];

    // Execute via service role - use the postgres connection directly
    for (const sql of sqls) {
      try {
        const { error } = await supabase.rpc("exec_sql", { query: sql });
        if (error) {
          results.push("RPC failed for: " + sql.substring(0, 50) + "... Error: " + error.message);
        } else {
          results.push("OK: " + sql.substring(0, 50));
        }
      } catch (e) {
        results.push("Exception: " + (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
