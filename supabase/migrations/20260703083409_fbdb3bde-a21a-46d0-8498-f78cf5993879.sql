-- Allow authenticated users to read their own walk_in queue entry so they can see position on /queue
CREATE POLICY "Users can view own walk_in entries"
  ON public.walk_ins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());