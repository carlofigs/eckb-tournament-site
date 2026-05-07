import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { r1Losers, rankLosers, computeStarTeam } from '@/lib/star'
import { isComplete, getWinner, getLoser } from '@/lib/games'
import { Swatch } from '@/components/Swatch'
import { cn } from '@/lib/utils'
import type { TeamName } from '@/lib/schemas'

export function Standings() {
  const games = useTournamentStore((s) => s.games)
  const losers = r1Losers(TOURNAMENT, games)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold mb-3">
          Round 1 Standings (Star contention)
        </h2>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm mb-3">
          <strong>Star team rules:</strong> the best-performing R1 loser advances
          to Game 12 as the 8th QF team. Sorted by run differential, then lowest
          total game score (5-4 ranks above 9-8), then head-to-head (see{' '}
          <code>STAR_TIEBREAKERS</code> in <code>src/lib/star.ts</code> for the
          configurable order).
        </div>

        {losers === null ? <PendingNotice /> : <LoserTable losers={losers} />}
      </div>

      <div>
        <h2 className="text-xl font-extrabold mb-3">Final placings</h2>
        <FinalPlacingsTable />
      </div>
    </section>
  )
}

function PendingNotice() {
  const games = useTournamentStore((s) => s.games)
  const r1 = TOURNAMENT.games.filter((g) => g.round === 'R1')
  const done = r1.filter((g) => isComplete(games[g.id])).length
  return (
    <div className="bg-card border rounded-lg p-4 text-sm">
      <p>
        <strong>Waiting for Round 1.</strong> {done} of {r1.length} games
        complete. The Star team will populate here once all 7 R1 games have
        winners.
      </p>
    </div>
  )
}

function LoserTable({ losers }: { losers: ReturnType<typeof r1Losers> }) {
  if (!losers) return null
  const ranked = rankLosers(losers)
  const star = ranked[0]
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-[0.7rem] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2 font-extrabold">#</th>
            <th className="px-2 py-2 font-extrabold text-left">Team</th>
            <th className="px-2 py-2 font-extrabold">R1 Game</th>
            <th className="px-2 py-2 font-extrabold">Run Diff</th>
            <th className="px-2 py-2 font-extrabold">RS</th>
            <th className="px-2 py-2 font-extrabold">RA</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((l, i) => {
            const isStar = l.team === star.team
            return (
              <tr
                key={l.team}
                className={cn(
                  'border-t text-center',
                  isStar && 'bg-gradient-to-r from-yellow-100 to-amber-100',
                )}
              >
                <td className="px-2 py-2 font-bold">
                  {isStar && <span aria-hidden className="text-amber-600">★ </span>}
                  {i + 1}
                </td>
                <td className="px-2 py-2 font-bold text-left">
                  <span className="inline-flex items-center gap-2">
                    <Swatch team={l.team} />
                    {l.team}
                  </span>
                </td>
                <td className="px-2 py-2">G{l.gameId}</td>
                <td className="px-2 py-2">
                  {l.runDiff > 0 ? '+' : ''}
                  {l.runDiff}
                </td>
                <td className="px-2 py-2">{l.runs}</td>
                <td className="px-2 py-2">{l.allowed}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Final placings ──────────────────────────────────────────────────
   14 rows that fill in progressively as games complete. Five bands:
     1st              (Final winner)
     2nd              (Final loser)
     3rd × 2          (SF losers)
     QF × 4           (QF losers)
     R1 × 6           (R1 non-Star losers)
   No individual ranking past 3rd — community-first league, not a
   leaderboard. Within each band, teams sort alphabetically.
   ─────────────────────────────────────────────────────────────────── */

interface PlacingRow {
  rank: string
  team: TeamName | null
}

function FinalPlacingsTable() {
  const games = useTournamentStore((s) => s.games)
  const getStar = () => computeStarTeam(TOURNAMENT, games)

  const final = getWinner(TOURNAMENT, games, 15, getStar)
  const runnerUp = getLoser(TOURNAMENT, games, 15, getStar)

  const sfLosers = [13, 14]
    .map((id) => getLoser(TOURNAMENT, games, id, getStar))
    .sort(alphaCompare)

  const qfLosers = [9, 10, 11, 12]
    .map((id) => getLoser(TOURNAMENT, games, id, getStar))
    .sort(alphaCompare)

  // R1 non-Star losers — we still call rankLosers to identify which
  // one was the Star (and therefore advanced), then list the rest
  // alphabetically. Star tiebreaker no longer drives ranking here.
  const r1NonStar: (TeamName | null)[] = (() => {
    const losers = r1Losers(TOURNAMENT, games)
    if (!losers) return Array<TeamName | null>(6).fill(null)
    const star = rankLosers(losers)[0]?.team
    return losers
      .map((l) => l.team)
      .filter((team) => team !== star)
      .sort(alphaCompare)
  })()

  const rows: PlacingRow[] = [
    { rank: '1st', team: final },
    { rank: '2nd', team: runnerUp },
    ...sfLosers.map((team) => ({ rank: '3rd', team })),
    ...qfLosers.map((team) => ({ rank: 'QF', team })),
    ...r1NonStar.map((team) => ({ rank: 'R1', team })),
  ]

  const totalGames = TOURNAMENT.games.length
  const playedGames = TOURNAMENT.games.filter((g) => isComplete(games[g.id])).length
  const tournamentDone = playedGames === totalGames

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {!tournamentDone && (
        <div className="bg-secondary text-xs text-muted-foreground px-3 py-2">
          Fills in as games complete · {playedGames} of {totalGames} done
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-[0.7rem] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2 font-extrabold w-20">Place</th>
            <th className="px-2 py-2 font-extrabold text-left">Team</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-t',
                i === 0 && 'bg-gradient-to-r from-yellow-100 to-amber-100',
              )}
            >
              <td className="px-2 py-2 font-extrabold text-center">
                {i === 0 && <span aria-hidden>🏆 </span>}
                {row.rank}
              </td>
              <td className="px-2 py-2 font-bold">
                {row.team ? (
                  <span className="inline-flex items-center gap-2">
                    <Swatch team={row.team} />
                    {row.team}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic font-normal">TBD</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function alphaCompare(a: TeamName | null, b: TeamName | null): number {
  // Nulls last so unfilled slots float to the bottom of their tied
  // band (tournament hasn't filled them in yet).
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b)
}
