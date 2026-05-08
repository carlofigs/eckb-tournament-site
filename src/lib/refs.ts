import type {
  AuthState,
  GameId,
  GameRefAssignment,
  GameScore,
  LineSlot,
  Ref,
  RefId,
  TeamName,
  Tournament,
} from '@/lib/schemas'
import { gameDef, getLoser, resolveTeam } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'

/**
 * Effective line slots for a game: stored DB value if present, else
 * the config-driven default. Always returns an array of length
 * `linesPerGame`. Stored `null` (organiser cleared the override)
 * falls back to the default — that's intentional, "Unassigned" in
 * the UI means "clear my override and use the default".
 */
export function effectiveLines(
  t: Tournament,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
): LineSlot[] {
  const def = gameDef(t, gameId)
  if (!def) return []
  const stored = gameRefs[gameId]?.lines ?? []
  return Array.from({ length: t.linesPerGame }, (_, i) => {
    const own = stored[i] ?? null
    if (own) return own
    return def.defaultLines?.[i] ?? null
  })
}

/**
 * Resolve a `LineSlot` to its concrete display/permission shape:
 * `null`, `{ ref }`, or `{ team }`. The `{ loserOf: G }` variant
 * resolves to whichever team lost game G — and special-cases the
 * Star team: when the loser of G turns out to BE the Star (so they're
 * busy playing Game 12 across the QF slot), the slot resolves to
 * `tournament.starSubstituteRefId` instead.
 */
export function resolveLineSlot(
  t: Tournament,
  scores: Record<GameId, GameScore>,
  slot: LineSlot,
): null | { ref: RefId } | { team: TeamName } {
  if (!slot) return null
  if ('ref' in slot) return slot
  if ('team' in slot) return slot
  // { loserOf: G }
  const getStar = () => computeStarTeam(t, scores)
  const loser = getLoser(t, scores, slot.loserOf, getStar)
  if (!loser) return null
  if (loser === getStar() && t.starSubstituteRefId) {
    return { ref: t.starSubstituteRefId }
  }
  return { team: loser }
}

/**
 * If `refId` is assigned (head or effective+resolved line) to this
 * game, returns "Head" / "Line 1" / etc. Used by MyGames to label
 * cards and by canEditScore (below) for permission checks.
 */
export function getRefRoleInGame(
  t: Tournament,
  scores: Record<GameId, GameScore>,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
  refId: RefId,
): string | null {
  const a = gameRefs[gameId]
  if (a?.head === refId) return 'Head'
  const lines = effectiveLines(t, gameRefs, gameId)
  for (let i = 0; i < lines.length; i++) {
    const r = resolveLineSlot(t, scores, lines[i])
    if (r && 'ref' in r && r.ref === refId) return `Line ${i + 1}`
  }
  return null
}

/**
 * Role-aware editability check. Score input is restricted to:
 *   - organisers (every game)
 *   - the HEAD REF of the game (line refs and volunteer-team players
 *     don't get score-entry access — they assist the head ref)
 *   - players: nothing
 *
 * Line-ref assignments are still rendered (badges, MyGames) so the
 * line ref knows their duty; they just don't input the score.
 */
export function canEditScore(
  auth: AuthState,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
): boolean {
  if (auth.role === 'organiser') return true
  if (auth.role === 'ref' && auth.refId) {
    return gameRefs[gameId]?.head === auth.refId
  }
  return false
}

/**
 * Refs assigned (head or effective+resolved line) to *other* games at
 * the same time slot. Used to filter the dropdowns so an organiser
 * can't double-book a ref across concurrent games.
 */
export function refsAtSameSlot(
  t: Tournament,
  scores: Record<GameId, GameScore>,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
): Set<RefId> {
  const def = gameDef(t, gameId)
  if (!def) return new Set()
  const conflicts = new Set<RefId>()
  for (const og of t.games) {
    if (og.id === gameId || og.time !== def.time) continue
    const r = gameRefs[og.id]
    if (r?.head) conflicts.add(r.head)
    for (const slot of effectiveLines(t, gameRefs, og.id)) {
      const resolved = resolveLineSlot(t, scores, slot)
      if (resolved && 'ref' in resolved) conflicts.add(resolved.ref)
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
  scores: Record<GameId, GameScore>,
  gameRefs: Record<GameId, GameRefAssignment>,
  gameId: GameId,
  exceptSlot: SlotKey,
): Set<RefId> {
  const taken = refsAtSameSlot(t, scores, gameRefs, gameId)
  const own = gameRefs[gameId]
  // Other slots of the same game.
  if (exceptSlot !== 'head' && own?.head) {
    taken.add(own.head)
  }
  effectiveLines(t, gameRefs, gameId).forEach((slot, idx) => {
    const isExcepted = typeof exceptSlot === 'object' && exceptSlot.line === idx
    if (isExcepted) return
    const resolved = resolveLineSlot(t, scores, slot)
    if (resolved && 'ref' in resolved) taken.add(resolved.ref)
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
