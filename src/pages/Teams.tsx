import { TOURNAMENT } from '@/lib/tournament'
import { TeamShield } from '@/components/TeamShield'

/**
 * The 14 teams as a grid of shield cards. Shields live at
 * /public/shields/<slug>.png; the slug is the lowercase team name
 * with spaces → hyphens. Missing files gracefully fall back to a
 * large coloured swatch, so a partial-import doesn't break the page.
 */
export function Teams() {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-3">Teams</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TOURNAMENT.teams.map((t) => (
          <div
            key={t.name}
            className="flex flex-col items-center gap-2 p-3 bg-card border rounded-xl"
          >
            <TeamShield team={t.name} className="w-24 h-24" />
            <span className="text-sm font-extrabold text-center">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
