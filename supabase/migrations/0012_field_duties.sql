-- =============================================================================
-- GRIMMERIE — field duties + theme columns on games
-- =============================================================================
-- Adds four columns to public.games for season game day metadata:
--
--   field_setup_teams    jsonb  — teams assigned to set up the field
--   field_packdown_teams jsonb  — teams assigned to pack down the field
--   game_day_theme       text   — theme name for the game day
--   game_day_theme_desc  text   — theme description / dress code blurb
--
-- Design note:
--   All four are game-day level attributes, not per fixture. They repeat
--   across all fixture rows for that game_day_number. Acceptable at this
--   scale. If game day metadata grows further, consider a game_days table.
--
-- Game 3 & 4 are a double-header on 2026-03-29:
--   Game 3 block — setup only  (field_packdown_teams = null)
--   Game 4 block — packdown only (field_setup_teams = null)
--   Both share the same theme.
--
-- Tournament rows are unaffected (all four columns remain null).
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → New query → Run.
--   Idempotent — re-running is safe.
-- =============================================================================


-- ── Add columns ───────────────────────────────────────────────────────────────

alter table public.games
  add column if not exists field_setup_teams    jsonb,
  add column if not exists field_packdown_teams jsonb,
  add column if not exists game_day_theme       text,
  add column if not exists game_day_theme_desc  text;


-- ── Seed: Summer 2026 ─────────────────────────────────────────────────────────

-- Game Day 1 — 2026-03-15 — Team Colour Pride
update public.games set
  field_setup_teams    = '["Black","Purple","Orange","Red"]',
  field_packdown_teams = '["Apple","Hay","Chocolate","Teal"]',
  game_day_theme       = 'Team Colour Pride',
  game_day_theme_desc  = 'Represent your team whether in a coloured tutu, headdress, or your favourite cap'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 1;

-- Game Day 2 — 2026-03-22 — Flip It Around… Wicked Wigs!
update public.games set
  field_setup_teams    = '["Apple","Hay","Green","Baby Blue"]',
  field_packdown_teams = '["Teal","Yellow","Orange","Black"]',
  game_day_theme       = 'Flip It Around… Wicked Wigs!',
  game_day_theme_desc  = 'Get ready for a wicked good time—think emerald glam, gravity-defying curls, and hair that''s totally spell-binding. The bolder the wig, the better!'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 2;

-- Game Day 3 — 2026-03-29 AM — Tu tu much (setup only; packdown = game 4)
update public.games set
  field_setup_teams    = '["Black","Orange","Yellow","Red"]',
  field_packdown_teams = null,
  game_day_theme       = 'Tu tu much',
  game_day_theme_desc  = 'Wear your team colour tutus!'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 3;

-- Game Day 4 — 2026-03-29 PM — Tu tu much (packdown only; setup = game 3)
update public.games set
  field_setup_teams    = null,
  field_packdown_teams = '["Baby Blue","Yellow","Apple","Hay"]',
  game_day_theme       = 'Tu tu much',
  game_day_theme_desc  = 'Wear your team colour tutus!'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 4;

-- Game Day 5 — 2026-04-12 — Easter Hat Parade
update public.games set
  field_setup_teams    = '["Green","Yellow","Baby Blue","Blue"]',
  field_packdown_teams = '["Red","Apple","Pink","Lilac"]',
  game_day_theme       = 'Easter Hat Parade',
  game_day_theme_desc  = 'Parade around the field showcasing your most fabulous Easter Hat!'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 5;

-- Game Day 6 — 2026-04-19 — Yellow Brick Rodeo
update public.games set
  field_setup_teams    = '["Baby Blue","Blue","Lilac","Apple"]',
  field_packdown_teams = '["Hay","Red","Black","Green"]',
  game_day_theme       = 'Yellow Brick Rodeo',
  game_day_theme_desc  = 'Horses, Cow Folks'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 6;

-- Game Day 7 — 2026-04-26 — All things (of other) Sports
update public.games set
  field_setup_teams    = '["Purple","Pink","Blue","Green"]',
  field_packdown_teams = '["Black","Apple","Baby Blue","Chocolate"]',
  game_day_theme       = 'All things (of other) Sports',
  game_day_theme_desc  = 'Dress up in any other sports and play Kickball!'
where context_type = 'season'
  and context_id    = 'sydney-2026-summer'
  and game_day_number = 7;


-- ── Verification ─────────────────────────────────────────────────────────────
-- select game_day_number, game_day_theme, field_setup_teams, field_packdown_teams
--   from public.games
--  where context_type = 'season' and context_id = 'sydney-2026-summer'
--  group by game_day_number, game_day_theme, field_setup_teams, field_packdown_teams
--  order by game_day_number;
-- Expected: 7 rows. Days 3+4 share the same theme. Days 3+4 each have one null duties column.
