import { useMemo } from 'react'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'

/**
 * Returns the active tournament config with the live fixture array
 * merged in. `TOURNAMENT.games` is always `[]` post-GRIMMERIE — this
 * hook is the single place that re-attaches the Supabase-loaded games.
 *
 * Use this everywhere you need a full `Tournament` object to pass to
 * lib utilities (resolveTeam, computeStarTeam, getWinner, …). Don't
 * write `{ ...TOURNAMENT, games: fixtures }` at call sites.
 */
export function useTournament() {
  const fixtures = useTournamentStore((s) => s.fixtures)
  return useMemo(() => ({ ...TOURNAMENT, games: fixtures }), [fixtures])
}
