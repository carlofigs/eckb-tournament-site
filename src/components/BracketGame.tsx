import type { Game } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { isComplete, getWinner, resolveTeam, teamLabel } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'
import { Swatch } from '@/components/Swatch'
import { RefBadges } from '@/components/RefBadges'
import { cn } from '@/lib/utils'

interface BracketGameProps {
  game: Game
}

/**
 * Compact game card used inside the bracket tree. Read-only — the
 * Schedule page is where scores are entered.
 */
export function BracketGame({ game }: BracketGameProps) {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)

  const t = { ...TOURNAMENT, games: fixtures }
  const getStar = () => computeStarTeam(t, games)
  const teamA = resolveTeam(t, games, game.teamA, getStar)
  const teamB = resolveTeam(t, games, game.teamB, getStar)
  const labelA = teamA ?? teamLabel(game.teamA)
  const labelB = teamB ?? teamLabel(game.teamB)
  const score = games[game.id] ?? { scoreA: null, scoreB: null }
  const decided = isComplete(score)
  const winner = getWinner(t, games, game.id, getStar)

  const isFinal = game.round === 'F'

  return (
    <div
      className={cn(
        'w-full bg-card border border-l-4 rounded-lg px-2.5 py-2',
        isFinal ? 'border-l-pride-yellow' : 'border-l-primary',
      )}
    >
      <div className="text-[0.7rem] text-muted-foreground font-bold uppercase tracking-wider mb-1">
        Game {game.id} · {game.field} · {game.time}
      </div>
      <BracketTeam
        team={teamA}
        label={labelA}
        score={score.scoreA}
        decided={decided}
        isWinner={winner === teamA}
      />
      <BracketTeam
        team={teamB}
        label={labelB}
        score={score.scoreB}
        decided={decided}
        isWinner={winner === teamB}
      />
      <RefBadges gameId={game.id} compact />
    </div>
  )
}

interface BracketTeamProps {
  team: string | null
  label: string
  score: number | null
  decided: boolean
  isWinner: boolean
}

function BracketTeam({ team, label, score, decided, isWinner }: BracketTeamProps) {
  const isLoser = decided && !isWinner
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 py-1 font-semibold',
        decided && (isWinner ? 'text-emerald-700' : 'text-muted-foreground'),
        !team && 'text-muted-foreground italic',
      )}
    >
      <Swatch team={team} />
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-auto font-extrabold min-w-6 text-right',
          isLoser && 'text-muted-foreground',
        )}
      >
        {score == null ? '' : score}
      </span>
    </div>
  )
}
