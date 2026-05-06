import { useMemo } from 'react'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { useAuthStore } from '@/store/auth'
import { GameRow } from '@/components/GameRow'
import { isComplete } from '@/lib/games'
import { cn } from '@/lib/utils'
import type { Game, GameRefAssignment, RefId } from '@/lib/schemas'

/**
 * Ref-only "My games" view. Shows only the games where the signed-in
 * ref is head or line, sorted by start time. Each card uses the same
 * <GameRow> component as the full Schedule, so score entry works in
 * place — refs don't need to bounce between tabs to enter scores.
 *
 * The tab is hidden for non-refs in AppShell. This page-level guard
 * is a fallback for direct navigation to /my-games.
 */
export function MyGames() {
  const role = useAuthStore((s) => s.role)
  const refId = useAuthStore((s) => s.refId)
  const refsMap = useTournamentStore((s) => s.refs)
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const games = useTournamentStore((s) => s.games)

  // Sort by the time-slot index (so "12:00 pm" sorts before "1:00 pm"
  // even though it doesn't lexicographically), then by game id within
  // the same slot.
  const myGames = useMemo(() => {
    if (!refId) return []
    const slotOrder = TOURNAMENT.timeSlots.map((s) => s.time)
    return TOURNAMENT.games
      .filter((g) => isMyGame(gameRefs[g.id], refId))
      .sort((a, b) => {
        const idx = slotOrder.indexOf(a.time) - slotOrder.indexOf(b.time)
        return idx !== 0 ? idx : a.id - b.id
      })
  }, [refId, gameRefs])

  if (role !== 'ref' || !refId) {
    return (
      <section>
        <h2 className="text-xl font-extrabold mb-3">My games</h2>
        <div className="bg-card border rounded-lg p-4 text-sm text-muted-foreground">
          Sign in as a ref (lock icon, top right) to see only the games
          you're assigned to.
        </div>
      </section>
    )
  }

  const me = refsMap[refId]
  const upcoming = myGames.filter((g) => !isComplete(games[g.id])).length
  const totalDone = myGames.length - upcoming

  return (
    <section>
      <h2 className="text-xl font-extrabold mb-1">
        My games{me?.name ? ` · ${me.name}` : ''}
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        {myGames.length === 0
          ? "Nothing assigned to you yet — check with the organiser."
          : `${myGames.length} game${myGames.length === 1 ? '' : 's'} assigned · ${totalDone} done · ${upcoming} to go`}
      </p>

      <div className="space-y-2">
        {myGames.map((g) => (
          <MyGameCard key={g.id} game={g} refId={refId} />
        ))}
      </div>
    </section>
  )
}

function MyGameCard({ game, refId }: { game: Game; refId: RefId }) {
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const games = useTournamentStore((s) => s.games)
  const myRole = roleInGame(gameRefs[game.id], refId)
  const done = isComplete(games[game.id])

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className={cn(
          'flex justify-between items-center px-3 py-1.5 text-[0.7rem] uppercase tracking-wider font-extrabold',
          myRole === 'Head'
            ? 'bg-pride-mint-deep text-pride-mint'
            : 'bg-secondary text-foreground',
        )}
      >
        <span>
          {myRole === 'Head' ? '★ ' : ''}
          {myRole}
        </span>
        {done && <span className="text-emerald-500 normal-case">✓ Final</span>}
      </div>
      <GameRow game={game} />
    </div>
  )
}

function isMyGame(a: GameRefAssignment | undefined, refId: RefId): boolean {
  if (!a) return false
  if (a.head === refId) return true
  return a.lines.some((s) => s && 'ref' in s && s.ref === refId)
}

function roleInGame(
  a: GameRefAssignment | undefined,
  refId: RefId,
): string | null {
  if (!a) return null
  if (a.head === refId) return 'Head'
  const idx = a.lines.findIndex((s) => s && 'ref' in s && s.ref === refId)
  return idx >= 0 ? `Line ${idx + 1}` : null
}
