import type {
  AuthState,
  GameId,
  GameRefAssignment,
  GameScore,
  Ref,
  RefId,
  TeamName,
  Tournament,
} from '@/lib/schemas'
import { gameDef, resolveTeam } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'

/**
 * If `refId` is assigned to `assignment` (head or line), returns
 * "Head" / "Line 1" / "Line 2" / etc. Returns null if the ref isn't
 * involved in this game. Used by MyGames to label cards and by
 * canEditScore (below) for permission checks.
 */
export function getRefRoleInGame(
  assignment: GameRefAssignment | undefined,
  refId: RefId,
): string | null {
  if (!assignment) return null
  if (assignment.head === refId) return 'Head'
  const idx = assignment.lines.findIndex(
    (slot) => slot && 'ref' in slot && slot.ref === refId,
  )
  return idx >= 0 ? `Line ${idx + 1}` : null
}

/**
 * Role-aware editability check. Mirrors the legacy version:
 *   - organiser: every game
 *   - ref:       only games where they're the head ref or one of the
 *                line refs (i.e. assigned to that game)
 *   - player:    nothing
 */
export function canEditScore(
  auth: AuthState,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
): boolean {
  if (auth.role === 'organiser') return true
  if (auth.role === 'ref' && auth.refId) {
    return getRefRoleInGame(gameRefs[gameId], auth.refId) !== null
  }
  return false
}

/**
 * Refs assigned (head or line) to *other* games at the same time slot.
 * Used to filter the dropdowns so an organiser can't double-book a ref
 * across concurrent games.
 */
export function refsAtSameSlot(
  t: Tournament,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
): Set<RefId> {
  const def = gameDef(t, gameId)
  if (!def) return new Set()
  const conflicts = new Set<RefId>()
  for (const og of t.games) {
    if (og.id === gameId || og.time !== def.time) continue
    const r = gameRefs[og.id]
    if (!r) continue
    if (r.head) conflicts.add(r.head)
    for (const slot of r.lines) {
      if (slot && 'ref' in slot) conflicts.add(slot.ref)
    }
  }
  return conflicts
}

/**
 * All refs that are taken for the perspective of `exceptSlot` in
 * `gameId`. Combines two sources of conflict:
 *
 *   1. Concurrent games at the same time slot (`refsAtSameSlot`)
 *   2. Other slots of the SAME game — a ref can't be both head and
 *      line of one game, and the two line slots can't share a ref.
 *
 * The slot named in `exceptSlot` is excluded so the dropdown still
 * shows the ref currently selected for it.
 */
export type SlotKey = 'head' | { line: number }

export function refsTakenForSlot(
  t: Tournament,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
  exceptSlot: SlotKey,
): Set<RefId> {
  const taken = refsAtSameSlot(t, gameRefs, gameId)
  const own = gameRefs[gameId]
  if (!own) return taken
  // Other slots of the same game.
  if (exceptSlot !== 'head' && own.head) {
    taken.add(own.head)
  }
  own.lines.forEach((slot, idx) => {
    const isExcepted = typeof exceptSlot === 'object' && exceptSlot.line === idx
    if (!isExcepted && slot && 'ref' in slot) taken.add(slot.ref)
  })
  return taken
}

/**
 * Refs whose team is playing at the same time slot as `gameId`. They
 * can't ref because they're on the field as players. Hidden from the
 * head + line dropdowns, just like refs already assigned elsewhere.
 *
 * Refs without a `team` affiliation are never filtered by this rule.
 * Mirrors the volunteer-team filter (`teamsPlayingAtSlot`) but
 * applied to named roster refs.
 */
export function refsBusyAsPlayers(
  t: Tournament,
  refsMap: Record<RefId, Ref>,
  scores: Record<GameId, GameScore>,
  gameId: GameId,
): Set<RefId> {
  const playingTeams = teamsPlayingAtSlot(t, scores, gameId)
  const busy = new Set<RefId>()
  for (const ref of Object.values(refsMap)) {
    if (ref.team && playingTeams.has(ref.team)) busy.add(ref.id)
  }
  return busy
}

/**
 * Teams playing in any game at the same time slot as `gameId`,
 * including `gameId` itself. Used to filter the "Volunteer team"
 * options on a line slot — a team's player can't ref a game while
 * their team is playing in a concurrent game.
 *
 * Unresolved teams (winnerOf / star refs that haven't been decided
 * yet) are skipped, so for QF/SF/F slots before earlier rounds
 * complete, the filter is more permissive — that's the right call:
 * we'll re-filter once data fills in.
 */
export function teamsPlayingAtSlot(
  t: Tournament,
  scores: Record<GameId, GameScore>,
  gameId: GameId,
): Set<TeamName> {
  const def = gameDef(t, gameId)
  if (!def) return new Set()
  const teams = new Set<TeamName>()
  const getStar = () => computeStarTeam(t, scores)
  for (const og of t.games) {
    if (og.time !== def.time) continue
    const a = resolveTeam(t, scores, og.teamA, getStar)
    const b = resolveTeam(t, scores, og.teamB, getStar)
    if (a) teams.add(a)
    if (b) teams.add(b)
  }
  return teams
}
