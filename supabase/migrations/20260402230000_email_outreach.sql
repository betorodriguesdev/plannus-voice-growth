-- ============================================
-- Email Outreach System — Plannus Voice Growth
-- ============================================

-- Sequências de email por lead
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  sender_address TEXT NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  stopped_reason TEXT,
  UNIQUE(lead_id)
);

-- Cada email da sequência (3-4 por lead)
CREATE TABLE IF NOT EXISTS email_steps (
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
);

CREATE INDEX IF NOT EXISTS idx_email_steps_pending
  ON email_steps(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_steps_resend_id
  ON email_steps(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- Eventos de tracking (webhook do Resend)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES email_steps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_step
  ON email_events(step_id);

-- RLS (mesmo padrão permissivo das outras tabelas)
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on email_sequences" ON email_sequences
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on email_steps" ON email_steps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on email_events" ON email_events
  FOR ALL USING (true) WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_email_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_sequence_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequence_updated_at();
