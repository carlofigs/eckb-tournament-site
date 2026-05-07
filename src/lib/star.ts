import type {
  GameId,
  GameScore,
  LoserRow,
  TeamName,
  Tournament,
} from '@/lib/schemas'
import { isComplete } from '@/lib/games'

/**
 * STAR TEAM SELECTION (CONFIGURABLE TIEBREAKERS)
 * ─────────────────────────────────────────────────────────────────────
 * The 7 R1 losers compete for the single "Star" slot in Game 12. Edit
 * the `STAR_TIEBREAKERS` array below to change the order of criteria.
 * Each entry returns a number where HIGHER is BETTER for that team.
 * The first criterion to break a tie wins; if all tie, we fall back
 * to game number ascending so the result is deterministic.
 *
 * 1. marginOfLoss  — runs scored minus runs allowed. For losers
 *      this is always negative; HIGHER (closer to 0) is better,
 *      i.e. the team that lost by the smallest margin. The UI
 *      displays the absolute value as "Lost by X" since "lower X
 *      = better" reads more naturally for non-stats folks.
 * 2. lowGameTotal  — combined runs in the game (loser's runs +
 *      winner's runs); LOWER total wins. Rationale: a tight low-
 *      scoring loss (5-4, total 9) reflects better defence than a
 *      tight high-scoring loss (9-8, total 17), so it ranks higher.
 *      Implemented by negating the total — the comparator treats
 *      higher as better.
 * 3. headToHead   — N/A in this format. Every R1 loser comes from a
 *      different game, so no two candidate Stars ever played each
 *      other. Listed for completeness; returns 0 for all candidates
 *      and is effectively a no-op. It will start to matter only if
 *      R1 ever expands to include rematches.
 */
export const STAR_TIEBREAKERS: Array<(loser: LoserRow) => number> = [
  (l) => l.runDiff,
  (l) => -(l.runs + l.allowed),
  (_l) => 0, // head-to-head placeholder, see comment above
]

/**
 * Compute the R1 losers in the same shape used for standings + star
 * selection. Returns null when R1 isn't fully decided yet (so the UI
 * can show "Waiting for Round 1").
 */
export function r1Losers(
  t: Tournament,
  scores: Record<GameId, GameScore>,
): LoserRow[] | null {
  const r1 = t.games.filter((g) => g.round === 'R1')
  const losers: LoserRow[] = []
  for (const g of r1) {
    const s = scores[g.id]
    if (!isComplete(s)) return null
    if (typeof g.teamA !== 'string' || typeof g.teamB !== 'string') {
      // Defensive — R1 must have literal team names, not refs.
      return null
    }
    const isLoserA = s.scoreA < s.scoreB
    const team = isLoserA ? g.teamA : g.teamB
    const runs = isLoserA ? s.scoreA : s.scoreB
    const allowed = isLoserA ? s.scoreB : s.scoreA
    losers.push({
      team,
      runs,
      allowed,
      runDiff: runs - allowed,
      gameId: g.id,
    })
  }
  return losers
}

export function rankLosers(losers: LoserRow[]): LoserRow[] {
  return [...losers].sort((a, b) => {
    for (const fn of STAR_TIEBREAKERS) {
      const diff = fn(b) - fn(a) // higher is better
      if (diff !== 0) return diff
    }
    return a.gameId - b.gameId // deterministic fallback
  })
}

export function computeStarTeam(
  t: Tournament,
  scores: Record<GameId, GameScore>,
): TeamName | null {
  const losers = r1Losers(t, scores)
  if (!losers) return null
  return rankLosers(losers)[0]?.team ?? null
}
