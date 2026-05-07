import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT } from '@/lib/tournament'
import { useSyncStore } from '@/store/sync'
import type { GameId, GameRefAssignment, GameScore, Ref, RefId } from '@/lib/schemas'

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
    console.warn('pushScore failed:', error.message)
    toast.error('Failed to sync score: ' + error.message)
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
    console.warn('pushRefs failed:', error.message)
    toast.error('Failed to sync ref assignment: ' + error.message)
    return
  }
  useSyncStore.getState().markSync()
}

export async function pushReset(): Promise<void> {
  if (!supabase) return
  // Reset clears scores + assignments only — the roster (refs table)
  // is preserved deliberately so an organiser doesn't lose their
  // ref list when they zero out the games.
  const [scores, refs] = await Promise.all([
    supabase.from('game_scores').delete().eq('tournament_id', TOURNAMENT.id),
    supabase.from('game_refs').delete().eq('tournament_id', TOURNAMENT.id),
  ])
  const err = scores.error?.message ?? refs.error?.message
  if (err) {
    console.warn('pushReset failed:', err)
    toast.error('Failed to sync reset: ' + err)
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
    console.warn('pushRef failed:', error.message)
    toast.error('Failed to save ref: ' + error.message)
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
    console.warn('pushDeleteRef failed:', error.message)
    toast.error('Failed to delete ref: ' + error.message)
    return
  }
  useSyncStore.getState().markSync()
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
