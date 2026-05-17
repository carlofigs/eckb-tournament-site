import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Announcement,
  Game,
  GameId,
  GameRefAssignment,
  GameScore,
  LineSlot,
  Ref,
  RefId,
  TournamentState,
} from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import {
  cancelPushRefDebounced,
  pushAnnouncement,
  pushAnnouncementDebounced,
  pushDeleteRef,
  pushRef,
  pushRefDebounced,
  pushRefs,
  pushResetAssignments,
  pushResetScores,
  pushScoreDebounced,
} from '@/lib/sync'

/**
 * Tournament state — scores, ref assignments, and the live ref roster.
 * Supabase is the source of truth; this store mirrors it locally so
 * the UI is fast and works offline. localStorage caches between page
 * loads; `useInitialSync` overlays the latest from Supabase on mount;
 * `useRealtimeSync` keeps it live afterward.
 *
 * Storage key is namespaced by tournament id so a future tournament
 * doesn't pick up stale data from an earlier season.
 */
const STORAGE_KEY = `kickball-tournament-${TOURNAMENT.id}-v1`

function emptyAssignment(): GameRefAssignment {
  return {
    head: null,
    lines: Array(TOURNAMENT.linesPerGame).fill(null) as LineSlot[],
  }
}

/** A `lines` array of the right length for the active tournament,
 *  filled in from `raw` where indices exist; remaining slots null. */
function normalizeLines(raw: LineSlot[] | undefined | null): LineSlot[] {
  return Array.from({ length: TOURNAMENT.linesPerGame }, (_, i) =>
    (raw && raw[i]) || null,
  )
}

function initialGames(): Record<GameId, GameScore> {
  const games: Record<GameId, GameScore> = {}
  for (const g of TOURNAMENT.games) {
    games[g.id] = { scoreA: null, scoreB: null }
  }
  return games
}

function initialGameRefs(): Record<GameId, GameRefAssignment> {
  const gameRefs: Record<GameId, GameRefAssignment> = {}
  for (const g of TOURNAMENT.games) {
    gameRefs[g.id] = emptyAssignment()
  }
  return gameRefs
}

function emptyAnnouncement(): Announcement {
  return { message: '', visible: false }
}

function initialState(): TournamentState {
  // refs starts empty — `useInitialSync` seeds from CONFIG.refs on
  // first run if the DB is empty, otherwise loads from the DB.
  return {
    games: initialGames(),
    gameRefs: initialGameRefs(),
    refs: {},
    announcement: emptyAnnouncement(),
  }
}

interface TournamentStore extends TournamentState {
  /**
   * Fixture array loaded from public.games. Empty until useInitialSync
   * completes the fetch. All components that previously read
   * TOURNAMENT.games should read this instead.
   */
  fixtures: Game[]
  fixturesLoaded: boolean
  fixturesError: string | null
  /** Called by useInitialSync once the games query resolves. */
  setFixtures: (fixtures: Game[]) => void
  setFixturesError: (err: string) => void

  /** User-driven mutations: optimistic local update + push to Supabase. */
  setScore: (id: GameId, side: 'A' | 'B', value: number | null) => void
  setHead: (id: GameId, refId: RefId | null) => void
  setLine: (id: GameId, idx: number, slot: LineSlot) => void
  /** Wipes scores only (every game back to null/null). */
  resetScores: () => void
  /** Wipes ref assignments only (every game back to head=null + empty line slots). */
  resetAssignments: () => void
  /**
   * Accepts a partial state — old export files predate the refs
   * roster, and the initial-sync hook also imports without touching
   * the roster. Missing keys are left as-is.
   */
  importState: (incoming: Partial<TournamentState>) => void
  addRef: (name: string, headEligible: boolean) => Ref
  updateRef: (id: RefId, patch: Partial<Omit<Ref, 'id'>>) => void
  deleteRef: (id: RefId) => void
  /** Patch the announcement (message and/or visibility). Pushes to
   *  Supabase, debounced for text input. */
  setAnnouncement: (patch: Partial<Announcement>) => void
  /**
   * Realtime-only writers — applied when Supabase pushes a change
   * from another device. They MUST NOT push back, otherwise we'd
   * loop. Use these from `useRealtimeSync` only; never from UI.
   */
  applyRemoteScore: (id: GameId, score: GameScore) => void
  applyRemoteRefs: (id: GameId, refs: GameRefAssignment) => void
  applyRemoteRef: (ref: Ref) => void
  applyRemoteDeleteRef: (id: RefId) => void
  applyRemoteAnnouncement: (announcement: Announcement) => void
}

export const useTournamentStore = create<TournamentStore>()(
  persist(
    immer((set) => ({
      ...initialState(),

      // ── Fixtures (loaded from Supabase games table) ────────────────
      fixtures: [],
      fixturesLoaded: false,
      fixturesError: null,

      setFixtures: (fixtures) =>
        set((s) => {
          s.fixtures = fixtures
          s.fixturesLoaded = true
          s.fixturesError = null
          // Seed score + gameRef slots for any game id not yet present.
          // Preserves scores that already arrived via importState (Supabase
          // fetch races with fixtures load) — only initialises missing slots.
          for (const g of fixtures) {
            if (!s.games[g.id]) s.games[g.id] = { scoreA: null, scoreB: null }
            if (!s.gameRefs[g.id]) s.gameRefs[g.id] = emptyAssignment()
          }
        }),

      setFixturesError: (err) =>
        set((s) => {
          s.fixturesError = err
          s.fixturesLoaded = true // stop the loading state even on error
        }),

      setScore: (id, side, value) => {
        set((s) => {
          if (!s.games[id]) s.games[id] = { scoreA: null, scoreB: null }
          if (side === 'A') s.games[id].scoreA = value
          else s.games[id].scoreB = value
        })
        // Push the post-mutation value (debounced so rapid typing
        // produces one upsert with the final value).
        const score = useTournamentStore.getState().games[id]
        if (score) pushScoreDebounced(id, score)
      },

      setHead: (id, refId) => {
        set((s) => {
          s.gameRefs[id].head = refId
        })
        void pushRefs(id, useTournamentStore.getState().gameRefs[id])
      },

      setLine: (id, idx, slot) => {
        set((s) => {
          s.gameRefs[id].lines[idx] = slot
        })
        void pushRefs(id, useTournamentStore.getState().gameRefs[id])
      },

      resetScores: () => {
        set((s) => {
          s.games = initialGames()
        })
        void pushResetScores()
      },

      resetAssignments: () => {
        set((s) => {
          s.gameRefs = initialGameRefs()
        })
        void pushResetAssignments()
      },

      addRef: (name, headEligible) => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `ref_${Date.now()}_${Math.random().toString(36).slice(2)}`
        // New refs default to no team — set later via the editor's
        // team picker. Keeps the add-form minimal.
        const ref: Ref = { id, name, headEligible, team: null }
        set((s) => {
          s.refs[id] = ref
        })
        void pushRef(ref)
        return ref
      },

      updateRef: (id, patch) => {
        set((s) => {
          const existing = s.refs[id]
          if (!existing) return
          s.refs[id] = { ...existing, ...patch }
        })
        const updated = useTournamentStore.getState().refs[id]
        // Debounced so name typing in the roster editor coalesces
        // into one upsert rather than firing per keystroke.
        if (updated) pushRefDebounced(updated)
      },

      deleteRef: (id) => {
        set((s) => {
          delete s.refs[id]
        })
        // Cancel any pending debounced update — otherwise a delayed
        // updateRef timer could re-create the row we're deleting.
        cancelPushRefDebounced(id)
        void pushDeleteRef(id)
      },

      setAnnouncement: (patch) => {
        set((s) => {
          s.announcement = { ...s.announcement, ...patch }
        })
        const next = useTournamentStore.getState().announcement
        // Toggle visible → push immediately so it lands on other
        // phones without the typing-style debounce delay; message
        // changes go through the debounced path.
        if ('visible' in patch && !('message' in patch)) {
          void pushAnnouncement(next)
        } else {
          pushAnnouncementDebounced(next)
        }
      },

      applyRemoteScore: (id, score) =>
        set((s) => {
          s.games[id] = score
        }),

      applyRemoteRefs: (id, refs) =>
        set((s) => {
          s.gameRefs[id] = refs
        }),

      applyRemoteRef: (ref) =>
        set((s) => {
          s.refs[ref.id] = ref
        }),

      applyRemoteDeleteRef: (id) =>
        set((s) => {
          delete s.refs[id]
        }),

      applyRemoteAnnouncement: (announcement) =>
        set((s) => {
          s.announcement = announcement
        }),

      importState: (incoming) =>
        set((s) => {
          // Each slice is only overwritten if the caller actually
          // supplied it. This matters for partial imports — if a
          // Supabase fetch errored on one of the three tables, we
          // leave that slice as-is rather than nuking local progress
          // with empty defaults.
          if (incoming.games) {
            // When TOURNAMENT.games is empty (post-migration, fixtures
            // come from Supabase), accept every game id from the
            // incoming payload without filtering. When the constant
            // still carries hardcoded games, restrict to known ids so
            // stale data from old seasons doesn't sneak in.
            const known = initialGames()
            const hasKnown = Object.keys(known).length > 0
            const base: Record<GameId, GameScore> = hasKnown ? known : {}
            for (const id of Object.keys(incoming.games)) {
              const numId = Number(id)
              if (!hasKnown || base[numId]) base[numId] = incoming.games[numId]
            }
            s.games = base
          }
          if (incoming.gameRefs) {
            const known = initialGameRefs()
            const hasKnown = Object.keys(known).length > 0
            const base: Record<GameId, GameRefAssignment> = hasKnown ? known : {}
            for (const id of Object.keys(incoming.gameRefs)) {
              const numId = Number(id)
              if (!hasKnown || base[numId]) {
                const inc = incoming.gameRefs[numId]
                base[numId] = {
                  head: inc.head ?? null,
                  lines: normalizeLines(inc.lines),
                }
              }
            }
            s.gameRefs = base
          }
          // Refs are free-form (no tournament-specific shape).
          if (incoming.refs) s.refs = { ...incoming.refs }
          if (incoming.announcement) s.announcement = { ...incoming.announcement }
        }),
    })),
    {
      name: STORAGE_KEY,
      // On rehydrate, reconcile cached state with the active
      // tournament's shape: unknown game ids are dropped, missing
      // ones get defaulted, line arrays normalised to the configured
      // length.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // When TOURNAMENT.games is populated (pre-migration), reconcile
        // the cached state against it: drop unknown ids and default
        // missing ones. When it is empty (post-migration, fixtures load
        // from Supabase), leave the cached state untouched so it serves
        // as a visual bootstrap until importState overlays Supabase data.
        const knownGames = initialGames()
        if (Object.keys(knownGames).length > 0) {
          for (const id of Object.keys(state.games)) {
            const numId = Number(id)
            if (knownGames[numId]) knownGames[numId] = state.games[numId]
          }
          state.games = knownGames

          const knownRefs = initialGameRefs()
          for (const id of Object.keys(state.gameRefs)) {
            const numId = Number(id)
            if (knownRefs[numId]) {
              const inc = state.gameRefs[numId]
              knownRefs[numId] = {
                head: inc.head ?? null,
                lines: normalizeLines(inc.lines),
              }
            }
          }
          state.gameRefs = knownRefs
        }
        // fixtures is transient — never persisted, always re-fetched.
        state.fixtures = []
        state.fixturesLoaded = false
        state.fixturesError = null
      },
    },
  ),
)

/** Convenience: serialised export of just the persisted state. */
export function exportTournamentState(): string {
  const s = useTournamentStore.getState()
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), state: { games: s.games, gameRefs: s.gameRefs } },
    null,
    2,
  )
}
