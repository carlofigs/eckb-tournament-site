/**
 * Shared TS shapes — the single contract between tournament config,
 * persisted state, and UI components.
 *
 * If you change a shape, expect a typecheck error somewhere; that's the
 * desired behaviour. New tournaments slot in by writing a `Tournament`
 * value (see lib/tournaments/) — all other code reads from it generically.
 */

export type TeamName = string
export type RefId = string
export type GameId = number
export type Field = string
export type RoundCode = 'R1' | 'QF' | 'SF' | 'F'

/* ── Team ──────────────────────────────────────────────────────────── */
export interface Team {
  name: TeamName
  /** Hex colour, e.g. "#89CFF0" */
  colour: string
}

/* ── Game ──────────────────────────────────────────────────────────── */
/** Reference to a team that resolves at render time. */
export type TeamRef =
  | TeamName // literal team (Round 1)
  | { winnerOf: GameId } // advances winner from an earlier game
  | { star: true } // the Star team (best R1 loser)

export interface Game {
  id: GameId
  round: RoundCode
  /** Display string, e.g. "1:00 pm" — must match a `TimeSlot.time` */
  time: string
  field: Field
  teamA: TeamRef
  teamB: TeamRef
  /** Optional pack-up note shown on the card. */
  packUp?: string
  /**
   * Default line-ref slots used when the live DB value is null. The
   * Refs editor still lets organisers override per-slot; "unassigned"
   * in the DB falls back to the default here. Length should match
   * `Tournament.linesPerGame`.
   */
  defaultLines?: LineSlot[]
}

/* ── Time slot ─────────────────────────────────────────────────────── */
export interface TimeSlotInfo {
  /** Free-text label for non-game slots (Set-up, Huddle, etc). */
  label: string
}
export interface TimeSlot {
  time: string
  /** Present for set-up / huddle / similar non-game items. */
  info?: TimeSlotInfo
}

/* ── Refs ──────────────────────────────────────────────────────────── */
export interface Ref {
  id: RefId
  name: string
  /** Only head-eligible refs appear in Head dropdowns. */
  headEligible: boolean
  /**
   * Optional team affiliation. When set, the ref is excluded from
   * assignment dropdowns at any time slot where their team is
   * playing (they can't ref while they're on the field). Null /
   * undefined = no affiliation, no extra filtering.
   */
  team?: TeamName | null
}

/** A single line-ref slot. `loserOf` resolves at render time to the
 *  team that lost the named game (and special-cases the Star team —
 *  see Tournament.starSubstituteRefId). */
export type LineSlot =
  | null
  | { ref: RefId }
  | { team: TeamName }
  | { loserOf: GameId }

export interface GameRefAssignment {
  head: RefId | null
  lines: LineSlot[]
}

/* ── Tournament config ─────────────────────────────────────────────── */
export interface Tournament {
  /**
   * Stable id used as the `tournament_id` foreign key in Supabase
   * (e.g. "summer-2026"). Must be unique across tournaments and
   * never change once data has been written.
   */
  id: string
  title: string
  /** Display string, e.g. "Sunday · 10 May 2026" */
  dateLabel: string
  teams: Team[]
  rounds: Record<RoundCode, string>
  timeSlots: TimeSlot[]
  games: Game[]
  refs: Ref[]
  /** Number of line refs each game has. */
  linesPerGame: number
  /**
   * Soft-auth PINs. NOT real security — anyone reading the source sees
   * them. Edit per-tournament.
   */
  pins: { ref: string; organiser: string }
  /**
   * Optional ref id that substitutes for a `{ loserOf: G }` slot when
   * the loser of game G turns out to be the Star team (and is therefore
   * busy playing Game 12 instead of refereeing). Set to a ref who's
   * reliably available across the QF time slot.
   */
  starSubstituteRefId?: RefId
}

/* ── Persisted state ──────────────────────────────────────────────── */
export interface GameScore {
  scoreA: number | null
  scoreB: number | null
}
export interface TournamentState {
  games: Record<GameId, GameScore>
  gameRefs: Record<GameId, GameRefAssignment>
  /**
   * Live ref roster — keyed by RefId. Bootstrap-seeded from
   * `Tournament.refs` on first sync, but DB is the source of truth
   * after that. Edits flow through the Refs page roster editor.
   */
  refs: Record<RefId, Ref>
  /**
   * Tournament-day announcement banner. Visibility is independent of
   * the message body so organisers can pre-write and then toggle on
   * at the right moment.
   */
  announcement: Announcement
}

export interface Announcement {
  message: string
  visible: boolean
}

/* ── Auth ──────────────────────────────────────────────────────────── */
export type Role = 'player' | 'ref' | 'organiser'
export interface AuthState {
  role: Role
  refId: RefId | null
}

/* ── Star-team standings row ──────────────────────────────────────── */
export interface LoserRow {
  team: TeamName
  runs: number
  allowed: number
  runDiff: number
  gameId: GameId
}
