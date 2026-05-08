import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  DbAnnouncement,
  DbGameRefs,
  DbGameScore,
  DbRef,
} from '@/lib/supabase'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { useSyncStore } from '@/store/sync'
import type { LineSlot } from '@/lib/schemas'

/**
 * Subscribe to row-level changes on `game_scores` and `game_refs` for
 * this tournament. Incoming events apply via `applyRemote*` actions
 * that DO NOT push back — otherwise we'd ping-pong.
 *
 * Self-echoes are fine: when a local user upserts a row, the change
 * also broadcasts back to them. Applying the same value is idempotent
 * — no visible flicker.
 *
 * No-ops when Supabase isn't configured.
 */
export function useRealtimeSync() {
  const applyRemoteScore = useTournamentStore((s) => s.applyRemoteScore)
  const applyRemoteRefs = useTournamentStore((s) => s.applyRemoteRefs)
  const applyRemoteRef = useTournamentStore((s) => s.applyRemoteRef)
  const applyRemoteDeleteRef = useTournamentStore((s) => s.applyRemoteDeleteRef)
  const applyRemoteAnnouncement = useTournamentStore(
    (s) => s.applyRemoteAnnouncement,
  )
  const setStatus = useSyncStore((s) => s.setStatus)
  const markSync = useSyncStore((s) => s.markSync)

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`tournament-${TOURNAMENT.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `tournament_id=eq.${TOURNAMENT.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<DbGameScore>
            if (typeof row.game_id === 'number') {
              applyRemoteScore(row.game_id, { scoreA: null, scoreB: null })
              markSync()
            }
            return
          }
          const row = payload.new as DbGameScore
          applyRemoteScore(row.game_id, {
            scoreA: row.score_a,
            scoreB: row.score_b,
          })
          markSync()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_refs',
          filter: `tournament_id=eq.${TOURNAMENT.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<DbGameRefs>
            if (typeof row.game_id === 'number') {
              applyRemoteRefs(row.game_id, {
                head: null,
                lines: Array<LineSlot>(TOURNAMENT.linesPerGame).fill(null),
              })
              markSync()
            }
            return
          }
          const row = payload.new as DbGameRefs
          // Normalise to the configured line count — defends against
          // a future linesPerGame change leaving stale-shape rows in
          // the DB.
          const rawLines = (row.lines ?? []) as LineSlot[]
          applyRemoteRefs(row.game_id, {
            head: row.head,
            lines: Array.from(
              { length: TOURNAMENT.linesPerGame },
              (_, i) => rawLines[i] ?? null,
            ) as LineSlot[],
          })
          markSync()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refs',
          filter: `tournament_id=eq.${TOURNAMENT.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<DbRef>
            if (typeof row.ref_id === 'string') {
              applyRemoteDeleteRef(row.ref_id)
              markSync()
            }
            return
          }
          const row = payload.new as DbRef
          applyRemoteRef({
            id: row.ref_id,
            name: row.name,
            headEligible: row.head_eligible,
            team: row.team ?? null,
          })
          markSync()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `tournament_id=eq.${TOURNAMENT.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            applyRemoteAnnouncement({ message: '', visible: false })
            markSync()
            return
          }
          const row = payload.new as DbAnnouncement
          applyRemoteAnnouncement({
            message: row.message ?? '',
            visible: !!row.visible,
          })
          markSync()
        },
      )
      .subscribe((status) => {
        // Map Supabase channel states to our sync indicator. The
        // channel reconnects automatically; we just surface what's
        // happening in the UI.
        switch (status) {
          case 'SUBSCRIBED':
            setStatus('connected')
            break
          case 'CHANNEL_ERROR':
            setStatus('error', 'Realtime channel error')
            break
          case 'TIMED_OUT':
            setStatus('reconnecting')
            break
          case 'CLOSED':
            setStatus('reconnecting')
            break
        }
      })

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [
    applyRemoteScore,
    applyRemoteRefs,
    applyRemoteRef,
    applyRemoteDeleteRef,
    applyRemoteAnnouncement,
    setStatus,
    markSync,
  ])
}
