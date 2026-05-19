import { useTournamentStore } from '@/store/tournament'
import type { TeamName } from '@/lib/schemas'

/**
 * Resolves rich display data for a team from the `teamMeta` store.
 *
 * When `team` is null (unresolved slot — "Winner of Game 5" etc.)
 * all display fields fall back to null so components can safely
 * show whatever label they computed themselves.
 *
 * When `team` is set but not yet in `teamMeta` (e.g. the fetch
 * hasn't landed yet, or this tournament predates GLINDA naming),
 * `displayName` and `emoji` are null — components fall back to the
 * bare colour name.
 */
export function useTeamDisplay(team: TeamName | null) {
  const meta = useTournamentStore((s) => (team ? (s.teamMeta[team] ?? null) : null))
  return {
    /** Resolved display name, or null if unavailable. */
    displayName: (team && meta?.displayName) ? meta.displayName : null,
    /** Emoji character, or null if unavailable. */
    emoji: meta?.emoji ?? null,
    /** Hex colour from season_teams, or null if unavailable (Swatch falls back to config). */
    colorHex: meta?.colorHex ?? null,
  }
}
