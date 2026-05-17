import type { Game } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { resolveTeam, teamLabel, nextSlot } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'
import { Swatch } from '@/components/Swatch'

/**
 * Up Next card on the Home page. Shows every concurrent game at the
 * earliest incomplete time slot — surfaces the "4 fields running at
 * once" reality of the day.
 */
export function NextSlotCard() {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const slot = nextSlot(fixtures, games, TOURNAMENT.timeSlots)

  if (!slot) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-base font-extrabold">Tournament complete</h3>
        <p className="text-sm text-muted-foreground mt-1">
          All games scored. Check the bracket for the result.
        </p>
      </div>
    )
  }

  const rounds = Array.from(
    new Set(slot.games.map((g) => TOURNAMENT.rounds[g.round])),
  )
  const n = slot.games.length

  return (
    <div className="rounded-xl border-l-4 border-l-pride-mint border bg-card p-4">
      <div className="flex items-start justify-between gap-3 pb-2 mb-3 border-b">
        <div>
          <span className="inline-block bg-pride-mint text-pride-mint-deep text-[0.65rem] uppercase tracking-widest font-extrabold rounded px-1.5 py-0.5 mb-1">
            Up Next
          </span>
          <div className="text-2xl font-extrabold leading-none">{slot.time}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-bold text-foreground text-sm">
            {rounds.join(' / ')}
          </div>
          {n} concurrent {n === 1 ? 'game' : 'games'}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {slot.games.map((g) => (
          <NextSlotGame key={g.id} game={g} />
        ))}
      </div>
    </div>
  )
}

function NextSlotGame({ game }: { game: Game }) {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const t = { ...TOURNAMENT, games: fixtures }
  const getStar = () => computeStarTeam(t, games)
  const teamA = resolveTeam(t, games, game.teamA, getStar)
  const teamB = resolveTeam(t, games, game.teamB, getStar)
  const labelA = teamA ?? teamLabel(game.teamA)
  const labelB = teamB ?? teamLabel(game.teamB)

  return (
    <div className="bg-secondary border rounded-lg px-2.5 py-2">
      <div className="flex justify-between text-[0.7rem] uppercase tracking-wider font-bold text-primary mb-1">
        <span>Game {game.id}</span>
        <span>{game.field}</span>
      </div>
      <Row team={teamA} label={labelA} />
      <Row team={teamB} label={labelB} />
    </div>
  )
}

function Row({ team, label }: { team: string | null; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 first:pt-0">
      <Swatch team={team} />
      <span
        className={`flex-1 truncate font-semibold ${
          team ? '' : 'text-muted-foreground italic font-medium'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
