-- AI metrics: per-call observability for cost, latency, and error tracking
create table if not exists ai_metrics (
  id uuid primary key default gen_random_uuid(),
  sync_key uuid not null,
  provider text not null,
  model text not null,
  analysis_type text,
  latency_ms integer not null,
  input_tokens integer,
  output_tokens integer,
  cost double precision,
  status text not null default 'success',
  error_message text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  app_version text
);

create index idx_ai_metrics_sync_key on ai_metrics (sync_key);
create index idx_ai_metrics_created_at on ai_metrics (created_at);

alter table ai_metrics enable row level security;

create policy "Users can insert own metrics"
  on ai_metrics for insert
  with check (auth.uid() = sync_key);

create policy "Users can read own metrics"
  on ai_metrics for select
  using (auth.uid() = sync_key);
