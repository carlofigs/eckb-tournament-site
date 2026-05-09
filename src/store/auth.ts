import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthState, RefId, Role } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'

/**
 * Auth lives in its own localStorage key (NOT in tournament state) so
 * it doesn't ride along when scores are exported between devices.
 *
 * "Soft auth" only — the PINs and roster are visible to anyone who
 * reads the source / DB. Acceptable for tournament-day trust between
 * organisers/refs/players who know each other.
 *
 * PIN model:
 *   - Organiser PIN: hardcoded in tournament config.
 *   - Each head-eligible ref has their own PIN (stored in DB on the
 *     ref row); entering it signs them in directly.
 *   - Line-only refs (head_eligible=false) share one universal PIN
 *     (also in tournament config). After entering it, the user picks
 *     their name from the roster — filtered to non-head refs.
 */
const STORAGE_KEY = `kickball-tournament-${TOURNAMENT.id}-auth-v1`

export type PinMatch =
  | { kind: 'organiser' }
  | { kind: 'head-ref'; refId: RefId }
  | { kind: 'line-ref' } // generic — needs name pick
  | { kind: 'invalid' }

interface AuthStore extends AuthState {
  /**
   * Identify which auth path a PIN unlocks. Drives the SignInDialog
   * flow — direct sign-in for organiser/head-ref, name-picker for
   * line-ref, error for invalid.
   */
  checkPin: (pin: string) => PinMatch
  signInOrganiser: () => void
  signInRef: (refId: RefId) => void
  signOut: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set) => ({
      role: 'player' as Role,
      refId: null,

      checkPin: (pin) => {
        if (!pin) return { kind: 'invalid' }
        if (pin === TOURNAMENT.pins.organiser) return { kind: 'organiser' }
        // Look up head-ref personal PINs from the live roster.
        const refs = useTournamentStore.getState().refs
        for (const r of Object.values(refs)) {
          if (r.headEligible && r.pin && r.pin === pin) {
            return { kind: 'head-ref', refId: r.id }
          }
        }
        if (pin === TOURNAMENT.pins.ref) return { kind: 'line-ref' }
        return { kind: 'invalid' }
      },

      signInOrganiser: () =>
        set((s) => {
          s.role = 'organiser'
          s.refId = null
        }),

      signInRef: (refId) =>
        set((s) => {
          s.role = 'ref'
          s.refId = refId
        }),

      signOut: () =>
        set((s) => {
          s.role = 'player'
          s.refId = null
        }),
    })),
    {
      name: STORAGE_KEY,
    },
  ),
)
