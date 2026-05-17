import type { GameId } from '@/lib/schemas'
import { useTournamentStore } from '@/store/tournament'
import { useTournament } from '@/hooks/useTournament'
import { effectiveLines, resolveLineSlot } from '@/lib/refs'
import { Swatch } from '@/components/Swatch'
import { cn } from '@/lib/utils'

interface RefBadgesProps {
  gameId: GameId
  /**
   * When `compact`, badges shrink — used inside bracket cards where
   * vertical space is tight.
   */
  compact?: boolean
}

/**
 * Inline summary of the refs assigned to a game. Read-only — used on
 * Schedule, Up Next, and Bracket. Resolves stored line slots: a named
 * ref, a volunteer team, or a `{ loserOf: G }` slot that resolves to
 * the team that lost game G (Star team substituted via
 * `tournament.starSubstituteRefId`).
 */
export function RefBadges({ gameId, compact }: RefBadgesProps) {
  const refs     = useTournamentStore((s) => s.refs)
  const games    = useTournamentStore((s) => s.games)
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const t        = useTournament()
  const assignment = gameRefs[gameId]

  const head = assignment?.head ? refs[assignment.head] : null
  // Stored head ref id that's no longer in the roster — surface it
  // so the mis-wiring is visible to whoever's reviewing.
  const headOrphan = assignment?.head && !head

  const lines = effectiveLines(t, gameRefs, gameId)
  const lineNodes = lines
    .map((slot, i) => {
      const resolved = resolveLineSlot(t, games, slot)
      if (!resolved) return null
      if ('ref' in resolved) {
        const r = refs[resolved.ref]
        if (!r) {
          return (
            <Badge key={i} variant="missing" compact={compact}>
              ⚠ Unknown ref
            </Badge>
          )
        }
        return (
          <Badge key={i} compact={compact}>
            {r.name}
          </Badge>
        )
      }
      // Volunteer team — show coloured swatch + team name
      return (
        <Badge key={i} variant="volunteer" compact={compact}>
          <Swatch team={resolved.team} size="sm" />
          <span>{resolved.team}</span>
        </Badge>
      )
    })
    .filter(Boolean)

  if (!head && !headOrphan && lineNodes.length === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-xs',
        compact ? 'mt-1.5' : 'mt-2',
      )}
    >
      <span className="text-[0.65rem] uppercase tracking-wider font-extrabold text-muted-foreground mr-0.5">
        Refs
      </span>
      {head && (
        <Badge variant="head" compact={compact}>
          ★ {head.name}
        </Badge>
      )}
      {headOrphan && (
        <Badge variant="missing" compact={compact}>
          ⚠ Unknown head ref
        </Badge>
      )}
      {lineNodes}
    </div>
  )
}

interface BadgeProps {
  variant?: 'default' | 'head' | 'volunteer' | 'missing'
  compact?: boolean
  children: React.ReactNode
}

function Badge({ variant = 'default', compact, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-semibold leading-tight',
        compact ? 'px-1.5 py-0.5 text-[0.7rem]' : 'px-1.5 py-0.5',
        variant === 'default' && 'bg-secondary text-foreground',
        variant === 'head' && 'bg-pride-mint-deep text-pride-mint',
        variant === 'volunteer' && 'bg-amber-100 text-amber-900 italic',
        variant === 'missing' && 'bg-red-100 text-red-800 italic',
      )}
    >
      {children}
    </span>
  )
}
