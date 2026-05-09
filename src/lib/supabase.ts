import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client. Reads from `import.meta.env`:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * If either is missing the client is `null` and the app falls back to
 * localStorage-only mode — useful for dev without a Supabase project,
 * and as a graceful failure mode if the env file isn't deployed.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

/** Database row shapes (kept narrow so the rest of the app types-check
 *  against `lib/schemas.ts` rather than DB column names). */
export interface DbGameScore {
  tournament_id: string
  game_id: number
  score_a: number | null
  score_b: number | null
  updated_at: string
}

export interface DbGameRefs {
  tournament_id: string
  game_id: number
  head: string | null
  lines: Array<{ ref: string } | { team: string } | null>
  updated_at: string
}

export interface DbRef {
  tournament_id: string
  ref_id: string
  name: string
  head_eligible: boolean
  /** Optional team affiliation; null when the ref isn't on a roster. */
  team: string | null
  /** Personal sign-in PIN for head-eligible refs; null otherwise. */
  pin: string | null
  updated_at: string
}

export interface DbAnnouncement {
  tournament_id: string
  message: string
  visible: boolean
  updated_at: string
}
