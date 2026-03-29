
CREATE POLICY "Allow anon select leads"
ON public.leads FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon select call_logs"
ON public.call_logs FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon select calendar_events"
ON public.calendar_events FOR SELECT
TO anon
USING (true);
