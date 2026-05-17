-- =============================================================================
-- GRIMMERIE — add city column to seasons and tournaments
-- =============================================================================
-- Supports multi-city expansion: Sydney, Perth, Brisbane, Melbourne.
-- CHECK constraint prevents casing drift (e.g. 'sydney' vs 'Sydney').
-- Extend the constraint with ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT
-- when a new city joins.
--
-- Future: if the league grows to many cities and needs per-city config
-- (different rule sets, organiser accounts, etc.), normalise to a leagues
-- table and swap this column for a league_id FK. For now, city text is
-- sufficient.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================

-- ── seasons ──────────────────────────────────────────────────────────────────

alter table public.seasons
  add column if not exists city text
    check (city in ('Sydney', 'Perth', 'Brisbane', 'Melbourne'));

-- Backfill: all existing records are Sydney
update public.seasons
  set city = 'Sydney'
  where city is null;

-- ── tournaments ──────────────────────────────────────────────────────────────

alter table public.tournaments
  add column if not exists city text
    check (city in ('Sydney', 'Perth', 'Brisbane', 'Melbourne'));

update public.tournaments
  set city = 'Sydney'
  where city is null;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select season_id, city from public.seasons;
-- select tournament_id, city from public.tournaments;
-- Expected: all rows show 'Sydney'
