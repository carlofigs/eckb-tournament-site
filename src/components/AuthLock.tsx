import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useTournamentStore } from '@/store/tournament'
import { SignInDialog } from '@/components/SignInDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

/**
 * Lock button on the right side of the sticky banner.
 *
 *  - Player: shows 🔒 + "Sign in" → opens the PIN dialog.
 *  - Ref:    shows 🔓 + ref's name → click prompts for sign-out.
 *  - Org:    shows 🔓 + "Organiser" → click prompts for sign-out.
 */
export function AuthLock() {
  // Individual primitive selectors — Zustand v5 doesn't auto-shallow.
  const role = useAuthStore((s) => s.role)
  const refId = useAuthStore((s) => s.refId)
  const signOut = useAuthStore((s) => s.signOut)
  const refsMap = useTournamentStore((s) => s.refs)
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isSignedIn = role !== 'player'
  const ref = refId ? refsMap[refId] : null
  const label =
    role === 'organiser' ? 'Organiser' : role === 'ref' ? ref?.name ?? 'Ref' : 'Sign in'

  const handleClick = () => {
    if (isSignedIn) setConfirmOpen(true)
    else setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'shrink-0 flex flex-col items-center justify-center gap-0.5 px-3.5 min-w-[64px]',
          'border-l border-neutral-800 text-[0.75rem] font-bold leading-tight tracking-wide uppercase',
          'hover:bg-white/5 transition-colors',
          isSignedIn ? 'text-pride-mint' : 'text-neutral-300',
        )}
        aria-label={isSignedIn ? `Signed in as ${label}, click to sign out` : 'Sign in'}
      >
        {isSignedIn ? (
          <Unlock aria-hidden className="size-4" />
        ) : (
          <Lock aria-hidden className="size-4" />
        )}
        <span className="max-w-[80px] truncate">{label}</span>
      </button>
      <SignInDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out?"
        description="You'll need your PIN to sign back in."
        confirmLabel="Sign out"
        onConfirm={signOut}
      />
    </>
  )
}
