import type { Game } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { useAuthStore } from '@/store/auth'
import { isComplete, getWinner, resolveTeam, teamLabel } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'
import { canEditScore } from '@/lib/refs'
import { TeamRow } from '@/components/TeamRow'
import { ScoreCell } from '@/components/ScoreCell'
import { RefBadges } from '@/components/RefBadges'

interface GameRowProps {
  game: Game
}

/**
 * One row in the schedule. Resolves both team refs (literal / winnerOf
 * / star), gates the score cells via `canEditScore`, and renders the
 * pack-up note + ref badges underneath.
 */
export function GameRow({ game }: GameRowProps) {
  const games = useTournamentStore((s) => s.games)
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const setScore = useTournamentStore((s) => s.setScore)
  // Individual primitive selectors — Zustand v5 doesn't auto-shallow,
  // so object-returning selectors trigger an infinite re-render loop.
  const role = useAuthStore((s) => s.role)
  const refId = useAuthStore((s) => s.refId)
  const auth = { role, refId }

  const fixtures = useTournamentStore((s) => s.fixtures)
  const score = games[game.id] ?? { scoreA: null, scoreB: null }

  const t = { ...TOURNAMENT, games: fixtures }
  const getStar = () => computeStarTeam(t, games)
  const teamA = resolveTeam(t, games, game.teamA, getStar)
  const teamB = resolveTeam(t, games, game.teamB, getStar)
  const labelA = teamA ?? teamLabel(game.teamA)
  const labelB = teamB ?? teamLabel(game.teamB)
  const winner = getWinner(t, games, game.id, getStar)
  const decided = isComplete(score)

  const teamsKnown = !!(teamA && teamB)
  const editable = teamsKnown && canEditScore(auth, gameRefs, game.id)

  const stateFor = (team: string | null): 'tbd' | 'winner' | 'loser' | undefined => {
    if (!team) return 'tbd'
    if (!decided) return undefined
    return winner === team ? 'winner' : 'loser'
  }

  return (
    <div className="bg-card px-3 py-2.5 border-t first:border-t-0 sm:[&:nth-child(odd)]:border-l-0 sm:[&:nth-child(even)]:border-l">
      <div className="flex justify-between text-[0.7rem] uppercase tracking-wider font-bold text-muted-foreground mb-1">
        <span>
          Game {game.id} · {TOURNAMENT.rounds[game.round]}
        </span>
        <span className="text-primary">{game.field}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <div>
          <TeamRow team={teamA} label={labelA} state={stateFor(teamA)} />
          <TeamRow team={teamB} label={labelB} state={stateFor(teamB)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <ScoreCell
            value={score.scoreA}
            editable={editable}
            disabled={!teamsKnown}
            ariaLabel={`Score for ${labelA}`}
            onChange={(v) => setScore(game.id, 'A', v)}
          />
          <ScoreCell
            value={score.scoreB}
            editable={editable}
            disabled={!teamsKnown}
            ariaLabel={`Score for ${labelB}`}
            onChange={(v) => setScore(game.id, 'B', v)}
          />
        </div>
      </div>

      {game.packUp && (
        <div className="mt-1.5 text-[0.7rem] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded inline-block">
          ⚑ {game.packUp}
        </div>
      )}

      <RefBadges gameId={game.id} />
    </div>
  )
}
