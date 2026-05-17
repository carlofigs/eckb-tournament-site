import { useTournamentStore } from '@/store/tournament'
import { BracketGame } from '@/components/BracketGame'

/**
 * Visual bracket: QF column → SF column → Final. On mobile, stacks
 * vertically with round headers. On ≥720px, renders as a tree with
 * CSS-pseudo-element connector lines (see index.css).
 *
 * Pair structure mirrors the schedule wiring:
 *   - QF pair 1: G9, G10  → feeds G13
 *   - QF pair 2: G11, G12 → feeds G14
 *   - SF pair:   G13, G14 → feeds G15
 */
export function BracketTree() {
  const fixtures = useTournamentStore((s) => s.fixtures)
  const qfGames = fixtures.filter((g) => g.round === 'QF')
  const sfGames = fixtures.filter((g) => g.round === 'SF')
  const fGames  = fixtures.filter((g) => g.round === 'F')

  // Group QF into pairs of 2 — feeds two SF games.
  const qfPairs: (typeof qfGames)[] = []
  for (let i = 0; i < qfGames.length; i += 2) {
    qfPairs.push(qfGames.slice(i, i + 2))
  }

  return (
    <div className="bracket-tree">
      <Column title="Quarter Finals" variant="qf">
        {qfPairs.map((pair, idx) => (
          <Pair key={idx}>
            {pair.map((g) => (
              <Slot key={g.id}>
                <BracketGame game={g} />
              </Slot>
            ))}
          </Pair>
        ))}
      </Column>

      <Column title="Semi Finals" variant="sf">
        <Pair>
          {sfGames.map((g) => (
            <Slot key={g.id}>
              <BracketGame game={g} />
            </Slot>
          ))}
        </Pair>
      </Column>

      <Column title="Final" variant="f">
        {fGames.map((g) => (
          <Slot key={g.id}>
            <BracketGame game={g} />
          </Slot>
        ))}
      </Column>
    </div>
  )
}

interface ColumnProps {
  title: string
  variant: 'qf' | 'sf' | 'f'
  children: React.ReactNode
}
function Column({ title, variant, children }: ColumnProps) {
  return (
    <div className={`bracket-col bracket-col-${variant}`}>
      <h3 className="text-[0.8rem] uppercase tracking-wider font-extrabold text-primary mb-2 md:text-center">
        {title}
      </h3>
      <div className="bracket-col-body">{children}</div>
    </div>
  )
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="bracket-pair">{children}</div>
}

function Slot({ children }: { children: React.ReactNode }) {
  return <div className="bracket-slot w-full">{children}</div>
}
