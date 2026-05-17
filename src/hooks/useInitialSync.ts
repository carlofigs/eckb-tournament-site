import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { useSyncStore } from '@/store/sync'
import { pushRef } from '@/lib/sync'
import { fetchTournamentGames } from '@/lib/supabase/queries/games'
import type {
  Announcement,
  GameId,
  GameRefAssignment,
  GameScore,
  LineSlot,
  Ref,
  RefId,
} from '@/lib/schemas'

/**
 * Mount-time fetch from Supabase + visibility-resume re-fetch.
 *
 * Strategy:
 *  - Once on mount, fetch every row for this tournament and merge
 *    into the local store. localStorage stays the bootstrap (instant
 *    first paint), then Supabase wins.
 *  - When the tab regains focus after being hidden, re-run the same
 *    fetch. Browser tab sleep can starve realtime subscriptions, and
 *    a one-shot re-fetch is the cheapest way to catch up.
 *
 * Silent on the status indicator: the realtime channel
 * (`useRealtimeSync`) is the single source of truth for the status
 * dot. Touching status here would lie on visibility-resume re-fetches
 * (the channel is usually still SUBSCRIBED, so nothing would event-
 * back to flip status away from "connecting"). All this hook does is
 * refresh data and bump `lastSyncAt` on success.
 *
 * No-ops when Supabase isn't configured.
 */
export function useInitialSync() {
  const importState = useTournamentStore((s) => s.importState)
  const setFixtures = useTournamentStore((s) => s.setFixtures)
  const setFixturesError = useTournamentStore((s) => s.setFixturesError)
  const markSync = useSyncStore((s) => s.markSync)

  const fetchAll = useCallback(async () => {
    if (!supabase) return

    // Fixtures: fetch once on mount (and again on tab-resume in case
    // resolved team names have been written back to the games table).
    // Errors are surfaced via fixturesError so AppShell can show an
    // explicit error state rather than silently showing an empty bracket.
    fetchTournamentGames(TOURNAMENT.id)
      .then(setFixtures)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn('Fixtures fetch failed:', msg)
        setFixturesError(msg)
      })

    const [scoresResult, gameRefsResult, rosterResult, announcementResult] =
      await Promise.all([
        supabase
          .from('game_scores')
          .select('game_id, score_a, score_b')
          .eq('tournament_id', TOURNAMENT.id),
        supabase
          .from('game_refs')
          .select('game_id, head, lines')
          .eq('tournament_id', TOURNAMENT.id),
        supabase
          .from('refs')
          .select('ref_id, name, head_eligible, team, pin')
          .eq('tournament_id', TOURNAMENT.id),
        supabase
          .from('announcements')
          .select('message, visible')
          .eq('tournament_id', TOURNAMENT.id)
          .maybeSingle(),
      ])

    // Handle each result independently so a missing optional table
    // (e.g. `refs` before its migration is applied) doesn't break the
    // others. Status is left to the realtime channel.
    if (scoresResult.error) {
      console.warn('Supabase scores fetch failed:', scoresResult.error.message)
    }
    if (gameRefsResult.error) {
      console.warn('Supabase game_refs fetch failed:', gameRefsResult.error.message)
    }
    if (rosterResult.error) {
      console.warn('Supabase refs fetch failed:', rosterResult.error.message)
    }
    if (announcementResult.error) {
      console.warn(
        'Supabase announcement fetch failed:',
        announcementResult.error.message,
      )
    }

    // Build a partial state of just the slices that came back ok.
    // Slices that errored stay undefined → importState leaves the
    // local copy alone rather than nuking it with empty defaults.
    const partial: Partial<{
      games: Record<GameId, GameScore>
      gameRefs: Record<GameId, GameRefAssignment>
      refs: Record<RefId, Ref>
      announcement: Announcement
    }> = {}

    if (!scoresResult.error) {
      const games: Record<GameId, GameScore> = {}
      for (const row of scoresResult.data ?? []) {
        games[row.game_id] = { scoreA: row.score_a, scoreB: row.score_b }
      }
      partial.games = games
    }

    if (!gameRefsResult.error) {
      const gameRefs: Record<GameId, GameRefAssignment> = {}
      for (const row of gameRefsResult.data ?? []) {
        gameRefs[row.game_id] = {
          head: row.head,
          lines: ((row.lines as LineSlot[] | null) ?? []) as LineSlot[],
        }
      }
      partial.gameRefs = gameRefs
    }

    // Roster: if the refs query came back successful AND empty, seed
    // from CONFIG so the organiser has a starting list. After seeding,
    // DB is the source of truth — config is never re-applied. Race-
    // safe across devices since each upsert is keyed on
    // (tournament_id, ref_id).
    if (!rosterResult.error) {
      const out: Record<RefId, Ref> = {}
      if ((rosterResult.data ?? []).length === 0 && TOURNAMENT.refs.length > 0) {
        for (const r of TOURNAMENT.refs) {
          out[r.id] = { ...r }
          void pushRef(r)
        }
      } else {
        for (const row of rosterResult.data ?? []) {
          out[row.ref_id] = {
            id: row.ref_id,
            name: row.name,
            headEligible: row.head_eligible,
            team: row.team ?? null,
            pin: row.pin ?? null,
          }
        }
      }
      partial.refs = out
    }

    if (!announcementResult.error) {
      // Row may not exist yet — `maybeSingle()` returns null data
      // without erroring. Default to a hidden empty banner.
      partial.announcement = announcementResult.data
        ? {
            message: announcementResult.data.message ?? '',
            visible: !!announcementResult.data.visible,
          }
        : { message: '', visible: false }
    }

    // Only mark synced if at least one slice came back. Otherwise the
    // Account page would lie ("Last sync: just now") on a totally
    // failed fetch.
    if (Object.keys(partial).length === 0) return
    importState(partial)
    markSync()
  }, [importState, markSync])

  useEffect(() => {
    if (!supabase) return

    void fetchAll().catch((err) => {
      console.warn('Initial sync threw:', err)
    })

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void fetchAll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchAll])
}
