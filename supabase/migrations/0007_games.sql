-- =============================================================================
-- GRIMMERIE — games table
-- =============================================================================
-- Unified fixture table covering both tournament (FIYERO) and regular
-- season (GLINDA / ELPHABA) games. Context is carried by context_type +
-- context_id, which point to a row in public.tournaments or public.seasons.
--
-- TOURNAMENT ROWS
--   team_a / team_b: literal team names for R1; null for QF/SF/Final
--     (unresolved until earlier results land — FIYERO resolves at render time
--     via team_a_ref / team_b_ref JSONB).
--   team_a_ref / team_b_ref: { "winnerOf": N } | { "star": true } | null
--   round: 'R1' | 'QF' | 'SF' | 'F'
--   game_day_number / match_time / line_ref_teams: null
--
-- SEASON ROWS
--   team_a / team_b: always literal team names (no dynamic refs in season play).
--   team_a_ref / team_b_ref: null
--   round: null
--   game_day_number: groups fixtures by game day (1–7)
--   match_time: groups fixtures within a game day ('3:00 PM' | '4:00 PM' | etc.)
--   line_ref_teams: JSONB array of team keys providing line ref, e.g. ["Pink"]
--
-- FIELD NAMES: standardised to short form — 'Road', 'Middle', 'Kiosk', 'Water'.
--   FIYERO source used 'Road Field' etc.; the suffix is stripped in the seed.
--
-- STATUS: historical records seeded as 'complete'. Future fixtures seed as
--   'scheduled'. ELPHABA transitions a row to 'in_progress' on game start
--   and 'complete' on submission.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================


-- ── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.games (
  id               uuid        not null default gen_random_uuid(),
  context_type     text        not null,
  context_id       text        not null,
  game_number      integer     not null,

  -- Teams: literal name once known; null for unresolved KO rounds
  team_a           text,
  team_b           text,
  -- Dynamic team references (tournament KO rounds only)
  -- Shape: {"winnerOf": N} | {"star": true}
  team_a_ref       jsonb,
  team_b_ref       jsonb,

  -- Lifecycle
  status           text        not null default 'scheduled',

  -- Scheduling
  scheduled_at     timestamptz,
  scheduled_time   text,        -- display string: '1:00 pm' | '3:00 PM'
  field            text,        -- short name: 'Road' | 'Middle' | 'Kiosk' | 'Water'

  -- Tournament-specific (null for season rows)
  round            text,        -- 'R1' | 'QF' | 'SF' | 'F'

  -- Season-specific (null for tournament rows)
  game_day_number  integer,     -- 1–N, groups fixtures by game day
  match_time       text,        -- '3:00 PM' | '4:00 PM' — groups within game day
  line_ref_teams   jsonb,       -- ["TeamKey", ...] — teams providing line ref

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  primary key (id),
  unique (context_type, context_id, game_number),
  constraint games_context_type_check
    check (context_type in ('tournament', 'season')),
  constraint games_status_check
    check (status in ('scheduled', 'in_progress', 'complete', 'cancelled'))
);

drop trigger if exists touch_games on public.games;
create trigger touch_games
  before update on public.games
  for each row execute function public.touch_updated_at();

alter table public.games enable row level security;

drop policy if exists "anon read games"  on public.games;
drop policy if exists "anon write games" on public.games;

create policy "anon read games"
  on public.games for select using (true);

create policy "anon write games"
  on public.games for all
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;


-- ── Seed data ────────────────────────────────────────────────────────────────
-- 14 Summer 2026 tournament fixtures + 49 Summer 2026 season fixtures
-- = 63 rows total.
--
-- Historical records seeded as status = 'complete'. Scores live in
-- game_scores (existing table); inning detail lives in game_inning_scores
-- (added in a later migration).

insert into public.games
  (context_type, context_id, game_number,
   team_a, team_b, team_a_ref, team_b_ref,
   status,
   scheduled_at, scheduled_time, field,
   round,
   game_day_number, match_time, line_ref_teams)
values

  -- ── Summer 2026 Tournament ──────────────────────────────────────────────
  -- 14 fixtures (Game 8 intentionally omitted — schedule template gap,
  -- 14 teams not 16). Numbers match ref group chat schedule.
  -- QF / SF / Final: team_a and team_b are null until earlier results land.
  ('tournament','summer-2026', 1,'Baby Blue','Pink',     null,null,                            'complete','2026-05-10 03:00:00+00','1:00 pm','Road',  'R1',null,null,null),
  ('tournament','summer-2026', 2,'Lilac',   'Green',     null,null,                            'complete','2026-05-10 03:00:00+00','1:00 pm','Middle','R1',null,null,null),
  ('tournament','summer-2026', 3,'Red',     'Hay',       null,null,                            'complete','2026-05-10 03:00:00+00','1:00 pm','Kiosk', 'R1',null,null,null),
  ('tournament','summer-2026', 4,'Black',   'Apple',     null,null,                            'complete','2026-05-10 03:00:00+00','1:00 pm','Water', 'R1',null,null,null),
  ('tournament','summer-2026', 5,'Yellow',  'Chocolate', null,null,                            'complete','2026-05-10 03:45:00+00','1:45 pm','Road',  'R1',null,null,null),
  ('tournament','summer-2026', 6,'Purple',  'Blue',      null,null,                            'complete','2026-05-10 03:45:00+00','1:45 pm','Middle','R1',null,null,null),
  ('tournament','summer-2026', 7,'Orange',  'Teal',      null,null,                            'complete','2026-05-10 03:45:00+00','1:45 pm','Kiosk', 'R1',null,null,null),
  ('tournament','summer-2026', 9,null,      null,        '{"winnerOf":1}'::jsonb,'{"winnerOf":2}'::jsonb,'complete','2026-05-10 04:30:00+00','2:30 pm','Road',  'QF',null,null,null),
  ('tournament','summer-2026',10,null,      null,        '{"winnerOf":3}'::jsonb,'{"winnerOf":4}'::jsonb,'complete','2026-05-10 04:30:00+00','2:30 pm','Middle','QF',null,null,null),
  ('tournament','summer-2026',11,null,      null,        '{"winnerOf":5}'::jsonb,'{"winnerOf":6}'::jsonb,'complete','2026-05-10 04:30:00+00','2:30 pm','Kiosk', 'QF',null,null,null),
  ('tournament','summer-2026',12,null,      null,        '{"winnerOf":7}'::jsonb,'{"star":true}'::jsonb, 'complete','2026-05-10 04:30:00+00','2:30 pm','Water', 'QF',null,null,null),
  ('tournament','summer-2026',13,null,      null,        '{"winnerOf":10}'::jsonb,'{"winnerOf":9}'::jsonb, 'complete','2026-05-10 05:15:00+00','3:15 pm','Road',  'SF',null,null,null),
  ('tournament','summer-2026',14,null,      null,        '{"winnerOf":11}'::jsonb,'{"winnerOf":12}'::jsonb,'complete','2026-05-10 05:15:00+00','3:15 pm','Middle','SF',null,null,null),
  ('tournament','summer-2026',15,null,      null,        '{"winnerOf":13}'::jsonb,'{"winnerOf":14}'::jsonb,'complete','2026-05-10 06:00:00+00','4:00 pm','Road',  'F', null,null,null),

  -- ── Summer 2026 Season — Game Day 1 (2026-03-15) ────────────────────────
  ('season','summer-2026', 1,'Black',    'Blue',      null,null,'complete','2026-03-15 05:00:00+00','3:00 PM','Kiosk', null,1,'3:00 PM','["Pink"]'::jsonb),
  ('season','summer-2026', 2,'Purple',   'Apple',     null,null,'complete','2026-03-15 05:00:00+00','3:00 PM','Road',  null,1,'3:00 PM','["Chocolate"]'::jsonb),
  ('season','summer-2026', 3,'Orange',   'Yellow',    null,null,'complete','2026-03-15 05:00:00+00','3:00 PM','Middle',null,1,'3:00 PM','["Lilac"]'::jsonb),
  ('season','summer-2026', 4,'Red',      'Green',     null,null,'complete','2026-03-15 05:00:00+00','3:00 PM','Water', null,1,'3:00 PM','["Baby Blue"]'::jsonb),
  ('season','summer-2026', 5,'Pink',     'Hay',       null,null,'complete','2026-03-15 06:00:00+00','4:00 PM','Kiosk', null,1,'4:00 PM','["Blue"]'::jsonb),
  ('season','summer-2026', 6,'Lilac',    'Chocolate', null,null,'complete','2026-03-15 06:00:00+00','4:00 PM','Middle',null,1,'4:00 PM','["Yellow"]'::jsonb),
  ('season','summer-2026', 7,'Baby Blue','Teal',      null,null,'complete','2026-03-15 06:00:00+00','4:00 PM','Water', null,1,'4:00 PM','["Green"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 2 (2026-03-22) ────────────────────────
  ('season','summer-2026', 8,'Apple',    'Chocolate', null,null,'complete','2026-03-22 05:00:00+00','3:00 PM','Kiosk', null,2,'3:00 PM','["Purple"]'::jsonb),
  ('season','summer-2026', 9,'Hay',      'Lilac',     null,null,'complete','2026-03-22 05:00:00+00','3:00 PM','Road',  null,2,'3:00 PM','["Blue"]'::jsonb),
  ('season','summer-2026',10,'Green',    'Teal',      null,null,'complete','2026-03-22 05:00:00+00','3:00 PM','Middle',null,2,'3:00 PM','["Orange"]'::jsonb),
  ('season','summer-2026',11,'Baby Blue','Pink',      null,null,'complete','2026-03-22 05:00:00+00','3:00 PM','Water', null,2,'3:00 PM','["Red"]'::jsonb),
  ('season','summer-2026',12,'Purple',   'Yellow',    null,null,'complete','2026-03-22 06:00:00+00','4:00 PM','Kiosk', null,2,'4:00 PM','["Chocolate"]'::jsonb),
  ('season','summer-2026',13,'Blue',     'Orange',    null,null,'complete','2026-03-22 06:00:00+00','4:00 PM','Road',  null,2,'4:00 PM','["Lilac"]'::jsonb),
  ('season','summer-2026',14,'Red',      'Black',     null,null,'complete','2026-03-22 06:00:00+00','4:00 PM','Water', null,2,'4:00 PM','["Pink"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 3 (2026-03-29, same day as Game 4) ────
  ('season','summer-2026',15,'Black',    'Green',     null,null,'complete','2026-03-29 04:00:00+00','2:00 PM','Kiosk', null,3,'2:00 PM','["Pink"]'::jsonb),
  ('season','summer-2026',16,'Orange',   'Lilac',     null,null,'complete','2026-03-29 04:00:00+00','2:00 PM','Road',  null,3,'2:00 PM','["Baby Blue"]'::jsonb),
  ('season','summer-2026',17,'Yellow',   'Blue',      null,null,'complete','2026-03-29 04:00:00+00','2:00 PM','Middle',null,3,'2:00 PM','["Chocolate"]'::jsonb),
  ('season','summer-2026',18,'Red',      'Purple',    null,null,'complete','2026-03-29 04:00:00+00','2:00 PM','Water', null,3,'2:00 PM','["Apple"]'::jsonb),
  ('season','summer-2026',19,'Pink',     'Teal',      null,null,'complete','2026-03-29 05:00:00+00','3:00 PM','Kiosk', null,3,'3:00 PM','["Green"]'::jsonb),
  ('season','summer-2026',20,'Chocolate','Hay',       null,null,'complete','2026-03-29 05:00:00+00','3:00 PM','Middle',null,3,'3:00 PM','["Lilac","Blue"]'::jsonb),
  ('season','summer-2026',21,'Apple',    'Baby Blue', null,null,'complete','2026-03-29 05:00:00+00','3:00 PM','Water', null,3,'3:00 PM','["Purple"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 4 (2026-03-29, same day as Game 3) ────
  ('season','summer-2026',22,'Orange',   'Red',       null,null,'complete','2026-03-29 06:00:00+00','4:00 PM','Kiosk', null,4,'4:00 PM','["Baby Blue"]'::jsonb),
  ('season','summer-2026',23,'Black',    'Purple',    null,null,'complete','2026-03-29 06:00:00+00','4:00 PM','Middle',null,4,'4:00 PM','["Apple"]'::jsonb),
  ('season','summer-2026',24,'Green',    'Blue',      null,null,'complete','2026-03-29 06:00:00+00','4:00 PM','Water', null,4,'4:00 PM','["Hay"]'::jsonb),
  ('season','summer-2026',25,'Lilac',    'Baby Blue', null,null,'complete','2026-03-29 07:00:00+00','5:00 PM','Kiosk', null,4,'5:00 PM','["Orange"]'::jsonb),
  ('season','summer-2026',26,'Chocolate','Yellow',    null,null,'complete','2026-03-29 07:00:00+00','5:00 PM','Road',  null,4,'5:00 PM','["Blue"]'::jsonb),
  ('season','summer-2026',27,'Pink',     'Apple',     null,null,'complete','2026-03-29 07:00:00+00','5:00 PM','Middle',null,4,'5:00 PM','["Black"]'::jsonb),
  ('season','summer-2026',28,'Teal',     'Hay',       null,null,'complete','2026-03-29 07:00:00+00','5:00 PM','Water', null,4,'5:00 PM','["Purple","Green"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 5 (2026-04-12) ────────────────────────
  ('season','summer-2026',29,'Green',    'Orange',    null,null,'complete','2026-04-12 05:00:00+00','3:00 PM','Kiosk', null,5,'3:00 PM','["Hay"]'::jsonb),
  ('season','summer-2026',30,'Yellow',   'Black',     null,null,'complete','2026-04-12 05:00:00+00','3:00 PM','Road',  null,5,'3:00 PM','["Chocolate"]'::jsonb),
  ('season','summer-2026',31,'Baby Blue','Red',       null,null,'complete','2026-04-12 05:00:00+00','3:00 PM','Middle',null,5,'3:00 PM','["Pink"]'::jsonb),
  ('season','summer-2026',32,'Blue',     'Purple',    null,null,'complete','2026-04-12 05:00:00+00','3:00 PM','Water', null,5,'3:00 PM','["Teal"]'::jsonb),
  ('season','summer-2026',33,'Hay',      'Apple',     null,null,'complete','2026-04-12 06:00:00+00','4:00 PM','Kiosk', null,5,'4:00 PM','["Orange"]'::jsonb),
  ('season','summer-2026',34,'Chocolate','Pink',      null,null,'complete','2026-04-12 06:00:00+00','4:00 PM','Road',  null,5,'4:00 PM','["Black"]'::jsonb),
  ('season','summer-2026',35,'Teal',     'Lilac',     null,null,'complete','2026-04-12 06:00:00+00','4:00 PM','Water', null,5,'4:00 PM','["Purple"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 6 (2026-04-19) ────────────────────────
  ('season','summer-2026',36,'Baby Blue','Chocolate', null,null,'complete','2026-04-19 05:00:00+00','3:00 PM','Kiosk', null,6,'3:00 PM','["Yellow"]'::jsonb),
  ('season','summer-2026',37,'Blue',     'Hay',       null,null,'complete','2026-04-19 05:00:00+00','3:00 PM','Road',  null,6,'3:00 PM','["Green"]'::jsonb),
  ('season','summer-2026',38,'Lilac',    'Pink',      null,null,'complete','2026-04-19 05:00:00+00','3:00 PM','Middle',null,6,'3:00 PM','["Orange"]'::jsonb),
  ('season','summer-2026',39,'Apple',    'Teal',      null,null,'complete','2026-04-19 05:00:00+00','3:00 PM','Water', null,6,'3:00 PM','["Purple"]'::jsonb),
  ('season','summer-2026',40,'Yellow',   'Red',       null,null,'complete','2026-04-19 06:00:00+00','4:00 PM','Kiosk', null,6,'4:00 PM','["Chocolate"]'::jsonb),
  ('season','summer-2026',41,'Orange',   'Black',     null,null,'complete','2026-04-19 06:00:00+00','4:00 PM','Middle',null,6,'4:00 PM','["Pink"]'::jsonb),
  ('season','summer-2026',42,'Purple',   'Green',     null,null,'complete','2026-04-19 06:00:00+00','4:00 PM','Water', null,6,'4:00 PM','["Teal"]'::jsonb),

  -- ── Summer 2026 Season — Game Day 7 (2026-04-26) ────────────────────────
  ('season','summer-2026',43,'Purple',   'Orange',    null,null,'complete','2026-04-26 05:00:00+00','3:00 PM','Kiosk', null,7,'3:00 PM','["Lilac"]'::jsonb),
  ('season','summer-2026',44,'Pink',     'Black',     null,null,'complete','2026-04-26 05:00:00+00','3:00 PM','Road',  null,7,'3:00 PM','["Purple"]'::jsonb),
  ('season','summer-2026',45,'Blue',     'Red',       null,null,'complete','2026-04-26 05:00:00+00','3:00 PM','Middle',null,7,'3:00 PM','["Hay"]'::jsonb),
  ('season','summer-2026',46,'Green',    'Yellow',    null,null,'complete','2026-04-26 05:00:00+00','3:00 PM','Water', null,7,'3:00 PM','["Teal"]'::jsonb),
  ('season','summer-2026',47,'Lilac',    'Apple',     null,null,'complete','2026-04-26 06:00:00+00','4:00 PM','Kiosk', null,7,'4:00 PM','["Orange"]'::jsonb),
  ('season','summer-2026',48,'Hay',      'Baby Blue', null,null,'complete','2026-04-26 06:00:00+00','4:00 PM','Middle',null,7,'4:00 PM','["Red"]'::jsonb),
  ('season','summer-2026',49,'Teal',     'Chocolate', null,null,'complete','2026-04-26 06:00:00+00','4:00 PM','Water', null,7,'4:00 PM','["Yellow"]'::jsonb)

on conflict (context_type, context_id, game_number) do nothing;

-- Expected row counts after insert:
-- select context_type, count(*) from public.games group by context_type;
--   tournament | 14
--   season     | 49
