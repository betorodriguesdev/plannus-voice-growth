
-- Call logs table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_call_id TEXT UNIQUE,
  lead_id UUID,
  agent_id TEXT,
  call_status TEXT DEFAULT 'pending',
  direction TEXT DEFAULT 'outbound',
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  from_number TEXT,
  to_number TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  attempt_number INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name TEXT,
  pastor_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'novo',
  source TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  call_attempts INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'call',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  color TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key from call_logs to leads
ALTER TABLE public.call_logs ADD CONSTRAINT fk_call_logs_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- Enable RLS (public access for now since no auth yet)
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Permissive policies for edge functions (service role)
CREATE POLICY "Allow all for service role" ON public.call_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
