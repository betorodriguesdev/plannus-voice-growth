
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  tags TEXT[],
  notes TEXT,
  last_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_crm ON crm_contacts FOR ALL USING (true) WITH CHECK (true);

