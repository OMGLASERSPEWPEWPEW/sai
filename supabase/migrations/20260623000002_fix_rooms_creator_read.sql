-- Allow room creators to read their own rooms immediately after insert
-- (before they're added as a member)
CREATE POLICY "Creators can read own rooms"
  ON public.rooms FOR SELECT
  USING (created_by = auth.uid());
