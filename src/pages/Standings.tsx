import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { r1Losers, rankLosers, computeStarTeam } from '@/lib/star'
import { isComplete } from '@/lib/games'
import {
  getTeamStatus,
  statusIsActive,
  statusLabel,
  statusSortKey,
} from '@/lib/standings'
import { Swatch } from '@/components/Swatch'
import { cn } from '@/lib/utils'

export function Standings() {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const t = { ...TOURNAMENT, games: fixtures }
  const losers = r1Losers(t, games)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold mb-3">
          Round 1 Standings (Star contention)
        </h2>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm mb-3">
          <p className="mb-2">
            <strong>Star team rules:</strong> the best-performing R1 loser
            advances to Game 12 as the 8th QF team. Sorted by:
          </p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>Margin of loss (lower is better — lost by 1 ranks above lost by 9)</li>
            <li>Lowest combined game score (5-4 ranks above 9-8)</li>
            <li>
              Head-to-head <em>(n/a in this format — every R1 loser is from a
              different game)</em>
            </li>
          </ol>
        </div>

        {losers === null ? <PendingNotice /> : <LoserTable losers={losers} />}
      </div>

      <div>
        <h2 className="text-xl font-extrabold mb-3">Current standings</h2>
        <CurrentStandingsTable />
      </div>
    </section>
  )
}

function PendingNotice() {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const r1 = fixtures.filter((g) => g.round === 'R1')
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
            <th className="px-2 py-2 font-extrabold">Lost by</th>
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
                <td className="px-2 py-2">{Math.abs(l.runDiff)}</td>
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

/* ── Current standings ───────────────────────────────────────────────
   One row per team, sorted by their CURRENT depth in the tournament.
   Eliminated teams show their final placement (1st/2nd/3rd/QF/R1);
   teams still alive show "Still in <round>" — they sit between the
   eliminated bands they've already cleared and the next one they
   haven't reached. Updates live as games complete.
   ─────────────────────────────────────────────────────────────────── */

function CurrentStandingsTable() {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const t = { ...TOURNAMENT, games: fixtures }
  const getStar = () => computeStarTeam(t, games)

  const rows = TOURNAMENT.teams
    .map((team) => ({
      team: team.name,
      status: getTeamStatus(t, games, team.name, getStar),
    }))
    .sort((a, b) => {
      const k = statusSortKey(a.status) - statusSortKey(b.status)
      return k !== 0 ? k : a.team.localeCompare(b.team)
    })

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-[0.7rem] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2 font-extrabold w-32 text-left">Position</th>
            <th className="px-2 py-2 font-extrabold text-left">Team</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const champion = row.status.kind === '1st'
            const active = statusIsActive(row.status)
            return (
              <tr
                key={row.team}
                className={cn(
                  'border-t',
                  champion && 'bg-gradient-to-r from-yellow-100 to-amber-100',
                  i > 0 && rows[i - 1].status.kind !== row.status.kind && 'border-t-2',
                )}
              >
                <td
                  className={cn(
                    'px-2 py-2 font-extrabold',
                    active && 'italic text-muted-foreground font-semibold',
                  )}
                >
                  {champion && <span aria-hidden>🏆 </span>}
                  {statusLabel(row.status)}
                </td>
                <td className="px-2 py-2 font-bold">
                  <span className="inline-flex items-center gap-2">
                    <Swatch team={row.team} />
                    {row.team}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
