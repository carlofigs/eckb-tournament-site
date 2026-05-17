import { NavLink, Outlet } from 'react-router-dom'
import { PrideStripe } from '@/components/PrideStripe'
import { AuthLock } from '@/components/AuthLock'
import { SyncStatus } from '@/components/SyncStatus'
import { useAuthStore } from '@/store/auth'
import { useTournamentStore } from '@/store/tournament'
import { nextSlot } from '@/lib/games'
import { TOURNAMENT } from '@/lib/tournament'
import { cn } from '@/lib/utils'
import type { Game } from '@/lib/schemas'

/**
 * Top-level layout. Sticky banner with: pride stripe → Up Next summary
 * + lock button → scrollable tab nav. Page content renders into
 * <Outlet>.
 *
 * Tab visibility is role-aware — the Refs tab is only shown to
 * organisers (the Refs page itself also gates content, so a deep-link
 * to /refs by a non-organiser still lands somewhere reasonable).
 */
const TABS: Array<{
  to: string
  label: string
  orgOnly?: boolean
  refOnly?: boolean
}> = [
  { to: '/',          label: 'Home' },
  { to: '/my-games',  label: 'My Games', refOnly: true },
  { to: '/schedule',  label: 'Schedule' },
  { to: '/bracket',   label: 'Bracket' },
  { to: '/standings', label: 'Standings' },
  { to: '/refs',      label: 'Refs', orgOnly: true },
  { to: '/account',   label: 'Account' },
]

export function AppShell() {
  const role           = useAuthStore((s) => s.role)
  const games          = useTournamentStore((s) => s.games)
  const fixtures       = useTournamentStore((s) => s.fixtures)
  const fixturesLoaded = useTournamentStore((s) => s.fixturesLoaded)
  const fixturesError  = useTournamentStore((s) => s.fixturesError)
  const slot = nextSlot(fixtures, games, TOURNAMENT.timeSlots)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-[#0a0a0a] text-white shadow-md">
        <PrideStripe />

        {/* Up Next + lock button row */}
        <div className="flex items-stretch">
          <div
            className="flex-1 min-w-0 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
            aria-live="polite"
          >
            {!fixturesLoaded ? (
              <span className="text-neutral-400 text-xs animate-pulse">Loading schedule…</span>
            ) : slot ? (
              <>
                <span className="inline-block rounded bg-pride-mint text-pride-mint-deep px-1.5 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wider">
                  Up Next
                </span>
                <strong>{slot.time}</strong>
                <span className="text-neutral-300">
                  {nextSlotRoundLabel(slot.games)}
                </span>
                <span className="text-neutral-400 text-xs">
                  {slot.games.length} concurrent {slot.games.length === 1 ? 'game' : 'games'}
                </span>
              </>
            ) : (
              <>
                <span className="inline-block rounded bg-emerald-600 text-white px-1.5 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wider">
                  Done
                </span>
                <span className="text-neutral-300">Tournament complete</span>
              </>
            )}
          </div>
          <SyncStatus />
          <AuthLock />
        </div>

        <nav className="flex overflow-x-auto bg-neutral-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.filter((t) => {
            if (t.orgOnly) return role === 'organiser'
            if (t.refOnly) return role === 'ref'
            return true
          }).map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-none whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-[3px] border-transparent',
                  isActive
                    ? 'text-white border-pride-mint'
                    : 'text-neutral-400 hover:text-neutral-200',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 max-w-[1100px] w-full mx-auto">
        {fixturesError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive bg-destructive/10 text-destructive p-4 text-sm"
          >
            <p className="font-extrabold mb-1">Failed to load schedule</p>
            <p className="text-xs opacity-80">{fixturesError}</p>
            <p className="text-xs mt-2 opacity-70">
              Reload the page to retry. Scores already entered are safe in local storage.
            </p>
          </div>
        ) : !fixturesLoaded ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm animate-pulse">
            Loading schedule…
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        Built for the fields · Works offline after first load.
      </footer>
    </div>
  )
}

function nextSlotRoundLabel(games: Game[]): string {
  const rounds = Array.from(new Set(games.map((g) => TOURNAMENT.rounds[g.round])))
  return rounds.join(' / ')
}
