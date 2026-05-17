import { supabase } from '@/lib/supabase'
import type { Game, RoundCode, TeamRef } from '@/lib/schemas'

/**
 * Shape returned by Supabase for a row in public.games.
 * Narrowed to only the columns we select.
 */
interface GamesRow {
  game_number: number
  team_a:      string | null
  team_b:      string | null
  team_a_ref:  { winnerOf?: number; star?: boolean } | null
  team_b_ref:  { winnerOf?: number; star?: boolean } | null
  scheduled_time: string | null
  field:       string | null
  round:       string | null
}

/**
 * Parse a DB row's (literal_name, ref_object) pair into a TypeScript
 * TeamRef. R1 rows carry a literal team name in `literalName` with
 * `ref` null; KO rows carry a JSONB object in `ref` with `literalName`
 * null (populated later when the game result lands).
 *
 * Exported for unit testing.
 */
export function parseTeamRef(
  literalName: string | null,
  ref: { winnerOf?: number; star?: boolean } | null,
): TeamRef {
  if (literalName != null) return literalName
  if (ref?.winnerOf != null) return { winnerOf: ref.winnerOf }
  if (ref?.star)             return { star: true }
  throw new Error(
    `Cannot parse TeamRef: literal=${literalName}, ref=${JSON.stringify(ref)}`,
  )
}

/**
 * Fetch all fixture rows for a tournament from public.games, ordered
 * by game_number. Returns a Game[] in the shape the rest of the app
 * already expects (same as the hardcoded TOURNAMENT.games constant
 * this replaces).
 *
 * Option B: DB stores short field names ('Road', 'Middle', …); the
 * app renders them as-is. No suffix appended here.
 *
 * Throws if supabase is not configured or the query fails — callers
 * are responsible for catching and surfacing the error.
 */
export async function fetchTournamentGames(tournamentId: string): Promise<Game[]> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('games')
    .select(
      'game_number, team_a, team_b, team_a_ref, team_b_ref, scheduled_time, field, round',
    )
    .eq('context_type', 'tournament')
    .eq('context_id', tournamentId)
    .order('game_number')

  if (error) throw error

  return (data as GamesRow[]).map((row) => ({
    id:    row.game_number,
    round: row.round as RoundCode,
    time:  row.scheduled_time ?? '',
    field: row.field ?? '',
    teamA: parseTeamRef(row.team_a, row.team_a_ref),
    teamB: parseTeamRef(row.team_b, row.team_b_ref),
  }))
}
