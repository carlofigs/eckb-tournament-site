-- =============================================================================
-- Per-head-ref PIN
-- =============================================================================
-- Replaces the single shared "ref" PIN with one PIN per head-eligible
-- ref. The organiser sees + edits PINs in the Roster table.
--
-- 6-character alphanumeric, case-insensitive on compare. Stored as
-- whatever the organiser typed; sign-in normalises to lowercase.
--
-- Auto-seeds a random 6-char hex PIN for any head-eligible ref that
-- doesn't already have one, so the live site is sign-in-ready right
-- after this migration runs. Organiser can edit any PIN to something
-- more memorable.
--
-- HOW TO RUN: paste into Supabase Studio → SQL Editor → Run.
-- Idempotent — re-running is safe.
-- =============================================================================

alter table public.refs
  add column if not exists pin text;

update public.refs
set pin = lower(substr(md5(random()::text || ref_id || now()::text), 1, 6))
where tournament_id = 'summer-2026'
  and head_eligible = true
  and pin is null;
