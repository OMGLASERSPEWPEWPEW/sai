-- Helper function to check room membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = check_room_id AND user_id = auth.uid()
  );
$$;

-- Helper to get all room_ids for the current user
CREATE OR REPLACE FUNCTION public.my_room_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT room_id FROM public.room_members WHERE user_id = auth.uid();
$$;

-- Drop and recreate policies that cause recursion

-- rooms
DROP POLICY IF EXISTS "Room members can read rooms" ON public.rooms;
CREATE POLICY "Room members can read rooms"
  ON public.rooms FOR SELECT
  USING (id IN (SELECT public.my_room_ids()));

-- room_members
DROP POLICY IF EXISTS "Room members can see members" ON public.room_members;
CREATE POLICY "Room members can see members"
  ON public.room_members FOR SELECT
  USING (public.is_room_member(room_id));

-- rounds
DROP POLICY IF EXISTS "Room members can see rounds" ON public.rounds;
CREATE POLICY "Room members can see rounds"
  ON public.rounds FOR SELECT
  USING (room_id IN (SELECT public.my_room_ids()));

DROP POLICY IF EXISTS "Room members can create rounds" ON public.rounds;
CREATE POLICY "Room members can create rounds"
  ON public.rounds FOR INSERT
  WITH CHECK (room_id IN (SELECT public.my_room_ids()));

DROP POLICY IF EXISTS "Room members can update rounds" ON public.rounds;
CREATE POLICY "Room members can update rounds"
  ON public.rounds FOR UPDATE
  USING (room_id IN (SELECT public.my_room_ids()));

-- submissions
DROP POLICY IF EXISTS "Room members can see submissions" ON public.submissions;
CREATE POLICY "Room members can see submissions"
  ON public.submissions FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM public.rounds r
      WHERE r.room_id IN (SELECT public.my_room_ids())
    )
  );

-- messages
DROP POLICY IF EXISTS "Room members can see messages" ON public.messages;
CREATE POLICY "Room members can see messages"
  ON public.messages FOR SELECT
  USING (room_id IN (SELECT public.my_room_ids()));

DROP POLICY IF EXISTS "Room members can post chat messages" ON public.messages;
CREATE POLICY "Room members can post chat messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (SELECT public.my_room_ids())
  );
