-- =============================================================================
-- GRIMMERIE — tournaments and seasons config tables
-- =============================================================================
-- These two tables are the config backbone for the Emerald City tool
-- ecosystem. Every fixture, score, ref assignment, and standings row
-- traces back to one of these rows via (context_type, context_id).
--
-- TOURNAMENTS — one row per single-day tournament (FIYERO context).
--   tournament_id is a stable text key matching the value already used
--   across all existing tables ('summer-2026'). Never change a
--   tournament_id once data has been written against it.
--
-- SEASONS — one row per regular-season run (GLINDA / ELPHABA context).
--   season_id follows the same text-key convention for consistency.
--
-- Soft-auth model: same anon read+write trust level as existing tables.
-- Tighten via Supabase Auth + role-aware policies when privacy matters.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query →
-- Run. Idempotent.
-- =============================================================================


-- ── tournaments ─────────────────────────────────────────────────────────────

create table if not exists public.tournaments (
  tournament_id    text        primary key,
  name             text        not null,
  scheduled_date   date,
  time_limit_min   integer     not null default 45,
  mercy_rule_cap   integer     not null default 7,
  -- Minimum innings for a game to count as valid (rule: at least 3).
  min_innings      integer     not null default 3,
  -- Expected innings used by ELPHABA to pre-render the inning score table.
  -- Not a hard cap — the ref calls last inning manually via the toggle.
  -- Scales with time limit: ~5 for 45 min, ~6 for 60 min.
  expected_innings integer     not null default 5,
  is_active        boolean     not null default false,
  updated_at       timestamptz not null default now()
);

drop trigger if exists touch_tournaments on public.tournaments;
create trigger touch_tournaments
  before update on public.tournaments
  for each row execute function public.touch_updated_at();

alter table public.tournaments enable row level security;

drop policy if exists "anon read tournaments"  on public.tournaments;
drop policy if exists "anon write tournaments" on public.tournaments;

create policy "anon read tournaments"
  on public.tournaments for select using (true);

create policy "anon write tournaments"
  on public.tournaments for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table public.tournaments;
  end if;
end $$;


-- ── seasons ──────────────────────────────────────────────────────────────────

create table if not exists public.seasons (
  season_id        text        primary key,
  name             text        not null,
  year             integer,
  start_date       date,
  end_date         date,
  time_limit_min   integer     not null default 45,
  mercy_rule_cap   integer     not null default 7,
  min_innings      integer     not null default 3,
  expected_innings integer     not null default 5,
  -- Array of division keys used as context for standings grouping.
  -- e.g. ARRAY['Div1', 'Div2']. Order determines display order in GLINDA.
  divisions        text[]      not null default '{}',
  is_active        boolean     not null default false,
  updated_at       timestamptz not null default now()
);

drop trigger if exists touch_seasons on public.seasons;
create trigger touch_seasons
  before update on public.seasons
  for each row execute function public.touch_updated_at();

alter table public.seasons enable row level security;

drop policy if exists "anon read seasons"  on public.seasons;
drop policy if exists "anon write seasons" on public.seasons;

create policy "anon read seasons"
  on public.seasons for select using (true);

create policy "anon write seasons"
  on public.seasons for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'seasons'
  ) then
    alter publication supabase_realtime add table public.seasons;
  end if;
end $$;


-- ── seed data ────────────────────────────────────────────────────────────────
-- Bootstrap the Summer 2026 records. Both are is_active = false — the
-- tournament and season have concluded. Set is_active = true on the
-- relevant row before the next event.
--
-- season_id 'summer-2026' and tournament_id 'summer-2026' are in
-- separate tables; the (context_type, context_id) pair in the games
-- table makes them unambiguous.

insert into public.tournaments
  (tournament_id, name, scheduled_date, time_limit_min, mercy_rule_cap, min_innings, expected_innings, is_active)
values
  ('summer-2026', 'Summer 2026 Kickball Tournament', '2026-05-10', 45, 7, 3, 5, false)
on conflict (tournament_id) do nothing;

insert into public.seasons
  (season_id, name, year, start_date, end_date, time_limit_min, mercy_rule_cap, min_innings, expected_innings, divisions, is_active)
values
  (
    'summer-2026',
    'Summer 2026 Season',
    2026,
    '2026-03-15',
    '2026-04-26',
    45,
    7,
    3,
    5,
    -- Division 1: Black, Blue, Green, Orange, Purple, Red, Yellow
    -- Division 2: Apple, Baby Blue, Chocolate, Hay, Lilac, Pink, Teal
    -- Keys match team colour keys used throughout the data model.
    ARRAY['Div1', 'Div2'],
    false
  )
on conflict (season_id) do nothing;
