-- =============================================================================
-- GRIMMERIE — season_teams table
-- =============================================================================
-- Join table between seasons and teams. One row per team per season.
--
-- PURPOSE
--   Division is not encoded in the fixture schedule — it must live here.
--   GLINDA derives division standings by joining games → season_teams on
--   (season_id, team_a/team_b). No division column needed on games itself.
--
--   Display metadata (name, emoji, hex colours) is stored per-season because
--   team names and branding can change between seasons.
--
-- COLUMNS
--   team_color       — the stable key used throughout the data model
--                      ('Black', 'Purple', etc.). Matches team_a / team_b in games.
--   display_name     — human name for this season ('Shade Brigade', etc.)
--   emoji            — single emoji representing the team
--   color_hex        — primary brand colour (#rrggbb)
--   pill_label_color — text/label colour to use on top of color_hex for legibility
--   division         — 'Div1' | 'Div2' — matches seasons.divisions array values.
--                      Null only during initial setup before division assignment.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================


-- ── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.season_teams (
  season_id         text        not null references public.seasons(season_id),
  team_color        text        not null,
  display_name      text,
  emoji             text,
  color_hex         text,
  pill_label_color  text,
  -- Division key — must match a value in seasons.divisions for this season_id.
  division          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  primary key (season_id, team_color)
);

drop trigger if exists touch_season_teams on public.season_teams;
create trigger touch_season_teams
  before update on public.season_teams
  for each row execute function public.touch_updated_at();

alter table public.season_teams enable row level security;

drop policy if exists "anon read season_teams"  on public.season_teams;
drop policy if exists "anon write season_teams" on public.season_teams;

create policy "anon read season_teams"
  on public.season_teams for select using (true);

create policy "anon write season_teams"
  on public.season_teams for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'season_teams'
  ) then
    alter publication supabase_realtime add table public.season_teams;
  end if;
end $$;


-- ── Seed data — Summer 2026 ───────────────────────────────────────────────────
-- Division split confirmed by opponent-overlap analysis (see season-schedule-analysis.md):
--   Div1: Black, Blue, Green, Orange, Purple, Red, Yellow
--   Div2: Apple, Baby Blue, Chocolate, Hay, Lilac, Pink, Teal
--
-- Display names, emoji, and hex values sourced from haskellcamargo/kickball
-- schedule.json (the reference season site). These are Summer 2026 values.
-- Cross-division fixture per team:
--   Purple→Apple, Green→Teal, Orange→Lilac, Black→Pink,
--   Blue→Hay, Red→Baby Blue, Yellow→Chocolate

insert into public.season_teams
  (season_id, team_color, display_name, emoji, color_hex, pill_label_color, division)
values

  -- Division 1
  ('summer-2026', 'Black',  'Shade Brigade',       '🕶️',  '#1a1a2e', '#e8e9f2', 'Div1'),
  ('summer-2026', 'Blue',   'LaBlubus',            '🦋',  '#3b82f6', '#00e8ff', 'Div1'),
  ('summer-2026', 'Green',  'The Green Flags',     '💚',  '#16a34a', '#ecfdf5', 'Div1'),
  ('summer-2026', 'Orange', 'The Big Buoys',       '🛟',  '#ff6b00', '#5c1f00', 'Div1'),
  ('summer-2026', 'Purple', 'The Drew Berrymores', '🫐',  '#7c3aed', '#faf5ff', 'Div1'),
  ('summer-2026', 'Red',    'Devilish Divas',      '😈',  '#ef4444', '#fef2f2', 'Div1'),
  ('summer-2026', 'Yellow', 'Lemon DeGeneres',     '🍋',  '#f1c40f', '#713f12', 'Div1'),

  -- Division 2
  ('summer-2026', 'Apple',     'Kicking Grass',          '🍏', '#a3e635', '#14532d', 'Div2'),
  ('summer-2026', 'Baby Blue', 'The Bebe Blues',         '👶', '#7dd3fc', '#0c4a6e', 'Div2'),
  ('summer-2026', 'Chocolate', 'Schitt''s Kick',         '🍫', '#92400e', '#fffbeb', 'Div2'),
  ('summer-2026', 'Hay',       'Fifty Shades of Grain',  '🌾', '#d4a843', '#422006', 'Div2'),
  ('summer-2026', 'Lilac',     'Kath & Kimethyst',       '💎', '#e9d5ff', '#6b21a8', 'Div2'),
  ('summer-2026', 'Pink',      'Pinkerbells',            '🧚', '#ec4899', '#fdf2f8', 'Div2'),
  ('summer-2026', 'Teal',      'HeaTEALed Rivalry',      '🦚', '#14b8a6', '#f0fdfa', 'Div2')

on conflict (season_id, team_color) do nothing;

-- Expected: 14 rows
-- select division, count(*) from public.season_teams
--   where season_id = 'summer-2026'
--   group by division order by division;
-- Div1 | 7
-- Div2 | 7
