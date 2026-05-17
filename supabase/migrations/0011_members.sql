-- =============================================================================
-- GRIMMERIE — members + team_members tables
-- =============================================================================
-- MEMBERS
--   Season-agnostic. One row per person across all seasons.
--   Stores only what is necessary: display name + optional avatar URL.
--   No email, phone, or legal name — minimise PII.
--   avatar_url: external URL only (Google Photos, etc.) — images are not
--   stored here. Null the field if a member leaves.
--
-- TEAM_MEMBERS
--   Join table: who is on which team in which season.
--   is_captain: two captains per team is the norm — multiple rows per
--   (season_id, team_color) can have is_captain = true.
--   Composite FK to season_teams ensures the team exists for that season
--   before a member can be assigned.
--
-- SEASON_TEAMS — captain_pin added
--   Team-level PIN for the captain lineup app. Both captains share the same
--   team PIN. Matches the existing PIN model used in refs (per-ref PIN).
--
-- REFS — member_id FK added
--   Links a ref to their members row. Enables name + avatar in ELPHABA's
--   ref assignment UI without duplicating display_name in refs.
--   Nullable — existing refs rows are backfilled manually or left null.
--
-- AUTH NOTE
--   All tables use the same soft-auth (anon read+write) model as the rest
--   of the schema. Tighten with Supabase Auth + role-aware RLS when the
--   captain lineup app requires identity-based write access.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================


-- ── members ──────────────────────────────────────────────────────────────────

create table if not exists public.members (
  id            uuid        not null default gen_random_uuid(),
  -- First name, nickname, or whatever they go by in the league.
  -- Not required to be a legal name.
  display_name  text        not null,
  -- External image URL only — not stored in Supabase.
  -- Null until the member supplies one.
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  primary key (id)
);

drop trigger if exists touch_members on public.members;
create trigger touch_members
  before update on public.members
  for each row execute function public.touch_updated_at();

alter table public.members enable row level security;

drop policy if exists "anon read members"  on public.members;
drop policy if exists "anon write members" on public.members;

create policy "anon read members"
  on public.members for select using (true);

create policy "anon write members"
  on public.members for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'members'
  ) then
    alter publication supabase_realtime add table public.members;
  end if;
end $$;


-- ── team_members ─────────────────────────────────────────────────────────────

create table if not exists public.team_members (
  season_id   text    not null references public.seasons(season_id),
  team_color  text    not null,
  member_id   uuid    not null references public.members(id),
  -- Two captains per team is standard. Both rows carry is_captain = true.
  -- The captain lineup app queries WHERE is_captain = true to load captain records.
  is_captain  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (season_id, team_color, member_id),
  -- Ensure the team exists in season_teams before a member can be assigned.
  foreign key (season_id, team_color)
    references public.season_teams (season_id, team_color)
);

drop trigger if exists touch_team_members on public.team_members;
create trigger touch_team_members
  before update on public.team_members
  for each row execute function public.touch_updated_at();

alter table public.team_members enable row level security;

drop policy if exists "anon read team_members"  on public.team_members;
drop policy if exists "anon write team_members" on public.team_members;

create policy "anon read team_members"
  on public.team_members for select using (true);

create policy "anon write team_members"
  on public.team_members for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
end $$;


-- ── season_teams — add captain_pin ───────────────────────────────────────────
-- Team-level PIN for the captain lineup app. Shared by both captains.
-- Follows the same PIN model as refs.pin and the organiser PIN in tournaments.
-- Set per season — captains can be rotated without changing the member record.

alter table public.season_teams
  add column if not exists captain_pin text;


-- ── refs — add member_id FK ──────────────────────────────────────────────────
-- Links a ref to their members row for display_name + avatar_url in ELPHABA.
-- Nullable — existing rows are backfilled manually once members are populated.
-- refs.name remains authoritative until fully migrated; member_id is additive.

alter table public.refs
  add column if not exists member_id uuid references public.members(id);

-- ── Verification ─────────────────────────────────────────────────────────────
-- select count(*) from public.members;
-- select count(*) from public.team_members;
-- select column_name from information_schema.columns
--   where table_name = 'season_teams' and column_name = 'captain_pin';
-- select column_name from information_schema.columns
--   where table_name = 'refs' and column_name = 'member_id';
