import { Megaphone } from 'lucide-react'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { useAuthStore } from '@/store/auth'
import { isComplete } from '@/lib/games'
import { NextSlotCard } from '@/components/NextSlotCard'

export function Home() {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const total = fixtures.length
  const played = fixtures.filter((g) => isComplete(games[g.id])).length
  const remaining = total - played

  return (
    <div>
      <AnnouncementBanner />

      <Hero />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat num={total} label="Games" />
        <Stat num={played} label="Played" />
        <Stat num={remaining} label="Remaining" />
      </div>

      <NextSlotCard />

      <AnnouncementEditor />
    </div>
  )
}

/**
 * Visible to everyone when an organiser has a live announcement up.
 * Renders nothing when the announcement is hidden or the message is
 * empty. Whitespace is preserved so a multi-line note formats as
 * written.
 */
function AnnouncementBanner() {
  const announcement = useTournamentStore((s) => s.announcement)
  if (!announcement.visible || !announcement.message.trim()) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 p-4 mb-4 flex gap-3 items-start"
    >
      <Megaphone aria-hidden className="size-5 mt-0.5 shrink-0" />
      <div className="whitespace-pre-wrap font-medium leading-snug">
        {announcement.message}
      </div>
    </div>
  )
}

/**
 * Organiser-only editor at the bottom of Home. Toggle to show/hide
 * the banner without losing the message text — useful for queueing a
 * note in advance and flipping it on at the right moment.
 *
 * Text changes debounce-push; the visibility toggle pushes
 * immediately so the banner appears on every other phone within the
 * usual realtime latency.
 */
function AnnouncementEditor() {
  const role = useAuthStore((s) => s.role)
  const announcement = useTournamentStore((s) => s.announcement)
  const setAnnouncement = useTournamentStore((s) => s.setAnnouncement)

  if (role !== 'organiser') return null

  return (
    <div className="bg-card border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-extrabold text-base flex items-center gap-2">
          <Megaphone aria-hidden className="size-4" />
          Announcement
        </h3>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={announcement.visible}
            onChange={(e) => setAnnouncement({ visible: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Show on Home
        </label>
      </div>
      <textarea
        value={announcement.message}
        onChange={(e) => setAnnouncement({ message: e.target.value })}
        placeholder="Anything you want everyone to see — weather delays, field changes, prize info..."
        rows={3}
        className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary resize-y"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Visible to everyone when toggled on. Syncs to all devices in
        realtime — no need to re-send links.
      </p>
    </div>
  )
}

function Hero() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#008026] to-[#016934] text-white p-6 mb-4 relative overflow-hidden">
      <div className="text-xs uppercase tracking-wider opacity-80">
        {TOURNAMENT.dateLabel}
      </div>
      <h1 className="text-2xl font-extrabold mt-1">{TOURNAMENT.title}</h1>
      <div className="text-sm opacity-90 mt-1">
        {TOURNAMENT.teams.length} teams · 4 fields · one big day
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1.5 bg-pride-stripe"
      />
    </div>
  )
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <div className="text-center bg-card border rounded-xl py-2 px-1">
      <div className="text-2xl font-extrabold text-primary leading-none">{num}</div>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold mt-1">
        {label}
      </div>
    </div>
  )
}
