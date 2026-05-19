import { Swatch } from '@/components/Swatch'
import { useTeamDisplay } from '@/hooks/useTeamDisplay'
import type { TeamName } from '@/lib/schemas'
import { cn } from '@/lib/utils'

interface TeamRowProps {
  team: TeamName | null
  /** Human label — either the resolved team name or "Winner of Game 5". */
  label: string
  /**
   * Visual state:
   *  - "tbd"     — placeholder (not yet resolved)
   *  - "winner"  — game is decided, this team won
   *  - "loser"   — game is decided, this team lost
   *  - undefined — known team, game not yet decided
   */
  state?: 'tbd' | 'winner' | 'loser'
}

export function TeamRow({ team, label, state }: TeamRowProps) {
  const { displayName, emoji } = useTeamDisplay(team)
  // Prefer display_name from season_teams; fall back to the label the
  // parent computed (which is already the bare colour name or "Winner of G5").
  const resolvedLabel = displayName ?? label

  return (
    <div className="flex items-center gap-2 py-1 [&+&]:border-t [&+&]:border-dashed [&+&]:border-border">
      <Swatch team={team} />
      <span
        className={cn(
          'flex-1 truncate font-semibold',
          state === 'tbd' && 'text-muted-foreground italic font-medium',
          state === 'winner' && 'text-emerald-700',
          state === 'loser' && 'text-muted-foreground line-through',
        )}
      >
        {emoji && <span aria-hidden className="mr-0.5">{emoji}</span>}
        {resolvedLabel}
        {state === 'winner' && <span aria-hidden> ✓</span>}
      </span>
    </div>
  )
}
