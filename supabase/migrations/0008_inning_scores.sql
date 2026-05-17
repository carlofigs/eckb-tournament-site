-- =============================================================================
-- GRIMMERIE — game_inning_scores table + game_scores migration path
-- =============================================================================
-- Two changes in one migration:
--
-- 1. GAME_SCORES — add game_uuid FK (nullable for now)
--    FIYERO upserts on (tournament_id, game_id) — that PK is unchanged.
--    game_uuid allows ELPHABA / GLINDA to join directly to games without
--    knowing tournament_id. A partial unique index covers the non-null rows.
--    Backfill updates all existing summer-2026 rows immediately.
--    Migration path: once FIYERO is updated to write game_uuid, make the
--    column NOT NULL, drop tournament_id + game_id columns, promote game_uuid
--    to PK. That is a separate future migration (post-FIYERO code change).
--
-- 2. GAME_INNING_SCORES — new table, one row per inning per game
--    ELPHABA writes inning runs as a game progresses.
--    Totals (score_a / score_b) are the sum across inning rows — game_scores
--    remains the canonical total for backward compat with FIYERO reads.
--    Mercy rule and min-innings validation happen in-app (ELPHABA), not here.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================


-- ── 1. game_scores — add game_uuid FK ────────────────────────────────────────

alter table public.game_scores
  add column if not exists game_uuid uuid references public.games(id);

-- Partial unique index: once a game_uuid is set it must be unique.
-- Allows nulls (tournament rows not yet backfilled, season rows not yet written).
create unique index if not exists game_scores_game_uuid_uidx
  on public.game_scores (game_uuid)
  where game_uuid is not null;

-- Backfill summer-2026 tournament rows immediately.
-- game_scores.game_id == games.game_number for the tournament context.
update public.game_scores gs
set    game_uuid = g.id
from   public.games g
where  g.context_type = 'tournament'
  and  g.context_id   = gs.tournament_id
  and  g.game_number  = gs.game_id
  and  gs.game_uuid is null;


-- ── 2. game_inning_scores ─────────────────────────────────────────────────────

create table if not exists public.game_inning_scores (
  id             uuid        not null default gen_random_uuid(),
  -- FK to the unified games table — works for both tournament and season.
  game_uuid      uuid        not null references public.games(id),
  inning_number  integer     not null,
  -- Runs scored by each side in this inning. Not nullable — ELPHABA always
  -- submits both sides together. Zero is a valid score.
  team_a_runs    integer     not null default 0,
  team_b_runs    integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  primary key (id),
  unique (game_uuid, inning_number),
  constraint inning_number_positive check (inning_number >= 1),
  constraint team_a_runs_non_negative check (team_a_runs >= 0),
  constraint team_b_runs_non_negative check (team_b_runs >= 0)
);

drop trigger if exists touch_game_inning_scores on public.game_inning_scores;
create trigger touch_game_inning_scores
  before update on public.game_inning_scores
  for each row execute function public.touch_updated_at();

alter table public.game_inning_scores enable row level security;

drop policy if exists "anon read game_inning_scores"  on public.game_inning_scores;
drop policy if exists "anon write game_inning_scores" on public.game_inning_scores;

create policy "anon read game_inning_scores"
  on public.game_inning_scores for select using (true);

create policy "anon write game_inning_scores"
  on public.game_inning_scores for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_inning_scores'
  ) then
    alter publication supabase_realtime add table public.game_inning_scores;
  end if;
end $$;


-- ── Notes on future migration steps ──────────────────────────────────────────
-- Once FIYERO is updated to include game_uuid in its upsert:
--
--   alter table public.game_scores alter column game_uuid set not null;
--   alter table public.game_scores drop column tournament_id;
--   alter table public.game_scores drop column game_id;
--   -- Then promote game_uuid to PK (drop old PK first).
--
-- Until then, game_scores.tournament_id + game_id remain the write path for
-- FIYERO and the backfill keeps game_uuid in sync for GLINDA / ELPHABA reads.
