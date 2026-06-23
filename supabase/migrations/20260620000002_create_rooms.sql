-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

CREATE POLICY "Room members can read rooms"
  ON public.rooms FOR SELECT
  USING (id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Room Members
CREATE TABLE public.room_members (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;

CREATE POLICY "Room members can see members"
  ON public.room_members FOR SELECT
  USING (room_id IN (SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid()));

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id);

-- Rounds
CREATE TYPE public.round_status AS ENUM ('collecting', 'processing', 'complete');

CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  status public.round_status NOT NULL DEFAULT 'collecting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (room_id, round_number)
);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;

CREATE POLICY "Room members can see rounds"
  ON public.rounds FOR SELECT
  USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Room members can create rounds"
  ON public.rounds FOR INSERT
  WITH CHECK (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Room members can update rounds"
  ON public.rounds FOR UPDATE
  USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

-- Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, user_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;

CREATE POLICY "Users can submit"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Room members can see submissions"
  ON public.submissions FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM public.rounds r
      JOIN public.room_members rm ON rm.room_id = r.room_id
      WHERE rm.user_id = auth.uid()
    )
  );

-- Messages
CREATE TYPE public.message_type AS ENUM ('system', 'ai_response', 'user_chat');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  type public.message_type NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  round_id UUID REFERENCES public.rounds(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_room_id ON public.messages(room_id);
CREATE INDEX idx_messages_round_id ON public.messages(round_id) WHERE round_id IS NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE POLICY "Room members can see messages"
  ON public.messages FOR SELECT
  USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Room members can post chat messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
  );

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
