-- =============================================================================
-- Tournament-day announcement banner
-- =============================================================================
-- One row per tournament. Organisers edit via the Home page; the row
-- broadcasts via realtime to all viewers. Show/hide independent of
-- the message body so an organiser can pre-write something and then
-- toggle it visible at the right moment.
-- =============================================================================

create table if not exists public.announcements (
  tournament_id text primary key,
  message       text    not null default '',
  visible       boolean not null default false,
  updated_at    timestamptz not null default now()
);

drop trigger if exists touch_announcements on public.announcements;
create trigger touch_announcements
  before update on public.announcements
  for each row execute function public.touch_updated_at();

alter table public.announcements enable row level security;

drop policy if exists "anon read announcements"  on public.announcements;
drop policy if exists "anon write announcements" on public.announcements;

create policy "anon read announcements"
  on public.announcements for select using (true);

create policy "anon write announcements"
  on public.announcements for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;
