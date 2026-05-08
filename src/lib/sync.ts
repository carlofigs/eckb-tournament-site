import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT } from '@/lib/tournament'
import { useSyncStore } from '@/store/sync'
import type {
  Announcement,
  GameId,
  GameRefAssignment,
  GameScore,
  Ref,
  RefId,
} from '@/lib/schemas'

/**
 * Write helpers — fire-and-forget upserts/deletes against Supabase.
 *
 * No rollback on failure: the local store keeps the user's intended
 * value (so the UI stays responsive) and a toast surfaces the sync
 * error. The next successful push reconciles the row. For tournament
 * day this trades a brief possible divergence for a calm UX; CRDTs
 * would be the upgrade if we ever needed strict cross-device merging.
 *
 * No-ops when Supabase isn't configured (env vars missing) — the app
 * keeps running from localStorage only in that case.
 */

async function pushScore(gameId: GameId, score: GameScore): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_scores')
    .upsert(
      {
        tournament_id: TOURNAMENT.id,
        game_id: gameId,
        score_a: score.scoreA,
        score_b: score.scoreB,
      },
      { onConflict: 'tournament_id,game_id' },
    )
  if (error) {
    syncErrorToast('Failed to sync score: ' + error.message, 'pushScore')
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushRefs(
  gameId: GameId,
  refs: GameRefAssignment,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_refs')
    .upsert(
      {
        tournament_id: TOURNAMENT.id,
        game_id: gameId,
        head: refs.head,
        lines: refs.lines,
      },
      { onConflict: 'tournament_id,game_id' },
    )
  if (error) {
    syncErrorToast('Failed to sync ref assignment: ' + error.message, 'pushRefs')
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushResetScores(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_scores')
    .delete()
    .eq('tournament_id', TOURNAMENT.id)
  if (error) {
    syncErrorToast('Failed to reset scores: ' + error.message, 'pushResetScores')
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushResetAssignments(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_refs')
    .delete()
    .eq('tournament_id', TOURNAMENT.id)
  if (error) {
    syncErrorToast(
      'Failed to reset ref assignments: ' + error.message,
      'pushResetAssignments',
    )
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushRef(ref: Ref): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('refs')
    .upsert(
      {
        tournament_id: TOURNAMENT.id,
        ref_id: ref.id,
        name: ref.name,
        head_eligible: ref.headEligible,
        team: ref.team ?? null,
      },
      { onConflict: 'tournament_id,ref_id' },
    )
  if (error) {
    syncErrorToast('Failed to save ref: ' + error.message, 'pushRef')
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushAnnouncement(announcement: Announcement): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('announcements')
    .upsert(
      {
        tournament_id: TOURNAMENT.id,
        message: announcement.message,
        visible: announcement.visible,
      },
      { onConflict: 'tournament_id' },
    )
  if (error) {
    syncErrorToast(
      'Failed to update announcement: ' + error.message,
      'pushAnnouncement',
    )
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushDeleteRef(refId: RefId): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('refs')
    .delete()
    .eq('tournament_id', TOURNAMENT.id)
    .eq('ref_id', refId)
  if (error) {
    syncErrorToast('Failed to delete ref: ' + error.message, 'pushDeleteRef')
    return
  }
  useSyncStore.getState().markSync()
}

/**
 * Surface a sync failure to the user with one shared toast slot per
 * push helper. Sonner's `id` parameter coalesces — a fresh error
 * replaces the old toast in place rather than stacking. Stops a
 * sustained outage from spamming 14 red toasts when scores rapid-
 * fail. Latest message wins so the user always sees the most recent
 * cause; console retains the full history for debugging.
 */
function syncErrorToast(message: string, source: string): void {
  console.warn(source + ' failed:', message)
  toast.error(message, { id: `sync-error:${source}` })
}

/**
 * Per-id debouncers. Score pushes coalesce rapid keystrokes ("1" →
 * "12" → "123" produces one upsert). Ref pushes coalesce roster
 * editor name typing so renaming a ref doesn't fire one upsert per
 * keystroke. Discrete events (head-eligible toggle, delete, add)
 * still call pushRef / pushDeleteRef directly without going through
 * the debouncer.
 */
const scoreTimers = new Map<GameId, ReturnType<typeof setTimeout>>()
const refTimers = new Map<RefId, ReturnType<typeof setTimeout>>()
const SCORE_DEBOUNCE_MS = 300
const REF_DEBOUNCE_MS = 400

export function pushScoreDebounced(gameId: GameId, score: GameScore): void {
  const existing = scoreTimers.get(gameId)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    scoreTimers.delete(gameId)
    void pushScore(gameId, score)
  }, SCORE_DEBOUNCE_MS)
  scoreTimers.set(gameId, timer)
}

export function pushRefDebounced(ref: Ref): void {
  const existing = refTimers.get(ref.id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    refTimers.delete(ref.id)
    void pushRef(ref)
  }, REF_DEBOUNCE_MS)
  refTimers.set(ref.id, timer)
}

/**
 * Cancel any pending debounced push for this refId. Called from the
 * store's `deleteRef` so we don't race-recreate a row we just told
 * the DB to delete.
 */
export function cancelPushRefDebounced(refId: RefId): void {
  const t = refTimers.get(refId)
  if (t) {
    clearTimeout(t)
    refTimers.delete(refId)
  }
}

/**
 * Announcement push is debounced too — typing into the textarea
 * shouldn't fire one upsert per keystroke. Only one announcement per
 * tournament so a single global timer is enough.
 */
let announcementTimer: ReturnType<typeof setTimeout> | undefined
const ANNOUNCEMENT_DEBOUNCE_MS = 500

export function pushAnnouncementDebounced(announcement: Announcement): void {
  if (announcementTimer) clearTimeout(announcementTimer)
  announcementTimer = setTimeout(() => {
    announcementTimer = undefined
    void pushAnnouncement(announcement)
  }, ANNOUNCEMENT_DEBOUNCE_MS)
}
