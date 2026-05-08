-- =============================================================================
-- Add Kirk Davies as the Star-substitute ref
-- =============================================================================
-- Kirk steps in as the line ref whenever a `{ loserOf: G }` slot
-- resolves to the Star team (who's busy playing Game 12 across the QF
-- slot). Tournament config sets `starSubstituteRefId: 'r17'`.
--
-- Idempotent — re-running this is safe (ON CONFLICT DO NOTHING).
-- =============================================================================

insert into public.refs (tournament_id, ref_id, name, head_eligible, team)
values ('summer-2026', 'r17', 'Kirk Davies', false, null)
on conflict (tournament_id, ref_id) do nothing;
