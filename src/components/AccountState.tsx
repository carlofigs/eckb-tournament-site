import { useEffect, useReducer, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSyncStore } from '@/store/sync'
import { useTournamentStore } from '@/store/tournament'
import { Button } from '@/components/ui/button'
import { SignInDialog } from '@/components/SignInDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

/**
 * Sign-in state card for the Account page. Mirrors the lock button on
 * the sticky banner but renders a richer summary.
 */
export function AccountState() {
  const role = useAuthStore((s) => s.role)
  const refId = useAuthStore((s) => s.refId)
  const signOut = useAuthStore((s) => s.signOut)
  const refsMap = useTournamentStore((s) => s.refs)
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const ref = refId ? refsMap[refId] : null

  return (
    <>
      <div
        className={cn(
          'bg-card border rounded-lg px-3 py-3 mb-3 flex flex-wrap items-center gap-2',
          'data-[role=ref]:bg-pride-mint/40',
          'data-[role=organiser]:bg-pride-mint-deep/5',
        )}
        data-role={role}
      >
        <span className="text-sm">You are signed in as</span>
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-full text-[0.7rem] uppercase tracking-wider font-extrabold',
            role === 'player' && 'bg-secondary text-foreground',
            role === 'ref' && 'bg-pride-mint text-pride-mint-deep',
            role === 'organiser' && 'bg-pride-mint-deep text-pride-mint',
          )}
        >
          {role}
          {role === 'ref' && ref && ` · ${ref.name}`}
        </span>

        <div className="ml-auto flex gap-2">
          {role === 'player' ? (
            <Button onClick={() => setOpen(true)}>Sign in</Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Sign out
            </Button>
          )}
        </div>
      </div>
      <SyncSummary />
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

/**
 * Realtime status + "Last sync" line. Re-renders every 15s so the
 * relative time stays current without listening to the system clock.
 * Hidden when Supabase isn't configured.
 */
function SyncSummary() {
  const status = useSyncStore((s) => s.status)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const errorMessage = useSyncStore((s) => s.errorMessage)
  const [, tick] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  if (status === 'offline') return null

  return (
    <div className="bg-card border rounded-lg px-3 py-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold">Realtime sync</span>
      <span
        className={cn(
          'inline-block px-2 py-0.5 rounded-full text-[0.7rem] uppercase tracking-wider font-extrabold',
          status === 'connected' && 'bg-emerald-100 text-emerald-800',
          status === 'connecting' && 'bg-amber-100 text-amber-800',
          status === 'reconnecting' && 'bg-amber-100 text-amber-800',
          status === 'error' && 'bg-red-100 text-red-800',
        )}
      >
        {status}
      </span>
      <span className="text-muted-foreground text-xs ml-auto">
        Last sync: {lastSyncAt ? formatRelative(lastSyncAt) : 'never'}
      </span>
      {errorMessage && (
        <span className="basis-full text-xs text-red-700">{errorMessage}</span>
      )}
    </div>
  )
}

function formatRelative(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleDateString()
}
