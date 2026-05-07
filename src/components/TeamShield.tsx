import { useState } from 'react'
import type { TeamName } from '@/lib/schemas'
import { Swatch } from '@/components/Swatch'

interface TeamShieldProps {
  team: TeamName
  /** Tailwind size classes — defaults to a Teams-grid card. */
  className?: string
}

/**
 * Renders the team's shield image from /public/shields/<slug>.png,
 * falling back to a large colour swatch if the file is missing or
 * fails to load. Slug = lowercase team name with spaces → hyphens
 * (matches the import script in public/shields/).
 *
 * Lazy-loaded so all 14 shields don't fetch at once on slow links.
 */
export function TeamShield({ team, className = 'w-24 h-24' }: TeamShieldProps) {
  const [failed, setFailed] = useState(false)
  const slug = team.toLowerCase().replace(/\s+/g, '-')
  const src = `${import.meta.env.BASE_URL}shields/${slug}.png`

  if (failed) {
    return <Swatch team={team} size="lg" className={className} />
  }

  return (
    <img
      src={src}
      alt={`${team} team shield`}
      loading="lazy"
      className={`${className} aspect-square object-contain`}
      onError={() => setFailed(true)}
    />
  )
}
