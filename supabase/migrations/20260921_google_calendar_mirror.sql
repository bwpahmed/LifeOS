-- Google Calendar mirror metadata.
-- Additive only: existing LifeOS calendar rows remain unchanged.
-- Supabase remains the persistent app source of truth; Google rows are read-only mirrored external events.

alter table public.calendar_items
  add column if not exists external_provider text,
  add column if not exists external_account text,
  add column if not exists external_calendar_id text,
  add column if not exists external_calendar_name text,
  add column if not exists external_event_id text,
  add column if not exists external_url text,
  add column if not exists external_updated_at timestamptz,
  add column if not exists is_read_only boolean not null default false;

create unique index if not exists calendar_items_external_event_uidx
  on public.calendar_items(workspace_id, external_provider, external_calendar_id, external_event_id)
  where external_provider is not null and external_event_id is not null;

create index if not exists calendar_items_external_provider_idx
  on public.calendar_items(workspace_id, external_provider, starts_at);
