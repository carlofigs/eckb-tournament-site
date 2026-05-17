import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { GameRow } from '@/components/GameRow'

/**
 * Full tournament schedule grouped by time slot. Score inputs are
 * gated by `canEditScore` inside GameRow — players see read-only
 * scores, refs only see editable inputs on their assigned games,
 * organisers see editable inputs everywhere.
 */
export function Schedule() {
  const fixtures = useTournamentStore((s) => s.fixtures)

  return (
    <section>
      <h2 className="text-xl font-extrabold mb-1">Schedule</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tap a score to enter it. Winners advance automatically.
      </p>

      <div className="space-y-4">
        {TOURNAMENT.timeSlots.map((slot) => {
          const slotGames = fixtures.filter((g) => g.time === slot.time)
          const fieldsLine = slotGames.map((g) => g.field).join(' · ')
          return (
            <div key={slot.time}>
              <div className="flex items-center justify-between bg-secondary border rounded-t-lg px-3 py-2">
                <span className="font-extrabold text-base">{slot.time}</span>
                <small className="text-muted-foreground font-semibold text-xs">
                  {fieldsLine}
                </small>
              </div>
              <div className="border border-t-0 rounded-b-lg overflow-hidden grid grid-cols-1 sm:grid-cols-2">
                {slot.info && (
                  <div className="bg-amber-100 text-amber-900 italic px-3 py-2 sm:col-span-2">
                    {slot.info.label}
                  </div>
                )}
                {slotGames.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
                {slotGames.length === 0 && !slot.info && (
                  <div className="bg-muted text-muted-foreground italic px-3 py-2 sm:col-span-2">
                    —
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
