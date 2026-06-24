-- Message reactions
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

create index idx_reactions_message_id on reactions (message_id);

alter table reactions enable row level security;

-- Users can see reactions on messages in their rooms
create policy "Users can read reactions in their rooms"
  on reactions for select
  using (
    exists (
      select 1 from messages m
      join room_members rm on rm.room_id = m.room_id
      where m.id = reactions.message_id
        and rm.user_id = auth.uid()
    )
  );

create policy "Users can add reactions"
  on reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on reactions for delete
  using (auth.uid() = user_id);

-- Enable realtime for reactions
alter table reactions replica identity full;
