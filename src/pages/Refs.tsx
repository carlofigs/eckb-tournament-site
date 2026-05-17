import { TOURNAMENT } from '@/lib/tournament'
import { useAuthStore } from '@/store/auth'
import { useTournamentStore } from '@/store/tournament'
import { RefAssignmentRow } from '@/components/RefAssignmentRow'
import { RosterEditor } from '@/components/RosterEditor'

/**
 * Organiser-only management page. The tab itself is hidden for
 * non-organisers in AppShell, but this gate handles deep-link visits
 * (e.g. someone hits /refs directly) so the page never leaks the
 * editable controls.
 */
export function Refs() {
  const role     = useAuthStore((s) => s.role)
  const fixtures = useTournamentStore((s) => s.fixtures)

  if (role !== 'organiser') {
    return (
      <section>
        <h2 className="text-xl font-extrabold mb-3">Ref assignments</h2>
        <div className="bg-card border rounded-lg p-4 text-sm text-muted-foreground">
          Sign in as an organiser to manage refs.
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold mb-1">Refs</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Manage the roster on the left, then assign refs to each game below.
        Edits sync across devices in realtime.
      </p>

      <RosterEditor />

      <h3 className="text-base font-extrabold mb-1 mt-6">Game assignments</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Pick the head ref (head-eligible only) and {TOURNAMENT.linesPerGame} line
        refs for each game. If no line ref is free at that time, set the slot
        to <em>Volunteer team</em> and a team's player will fill in. Refs
        already assigned to another concurrent game are filtered out
        automatically. Empty slots are highlighted in red.
      </p>

      <div className="space-y-2">
        {fixtures.map((g) => (
          <RefAssignmentRow key={g.id} game={g} />
        ))}
      </div>
    </section>
  )
}
