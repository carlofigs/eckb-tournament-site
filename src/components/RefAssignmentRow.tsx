import type { Game, GameRefAssignment, LineSlot, RefId, TeamName } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import { refsBusyAsPlayers, refsTakenForSlot, teamsPlayingAtSlot } from '@/lib/refs'
import { resolveTeam, teamLabel } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'
import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Swatch } from '@/components/Swatch'
import { cn } from '@/lib/utils'

/* Radix Select rejects empty-string values, so use a sentinel for the
   "Unassigned" option. */
const SENTINEL_NONE = '__none__'

interface RefAssignmentRowProps {
  game: Game
}

/**
 * One game row in the Refs management page (organiser-only). Three
 * selects: Head, Line 1, Line 2.
 *
 *   - Head dropdown: only head-eligible refs.
 *   - Line dropdowns: all refs + a "Volunteer: <team>" option per team
 *     (rendered as a coloured swatch in the dropdown list).
 *   - Refs already assigned at the same time slot are filtered out, so
 *     no double-bookings. The currently-assigned ref of THIS slot is
 *     always kept in its own dropdown.
 */
export function RefAssignmentRow({ game }: RefAssignmentRowProps) {
  const games = useTournamentStore((s) => s.games)
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const refsMap = useTournamentStore((s) => s.refs)
  const setHead = useTournamentStore((s) => s.setHead)
  const setLine = useTournamentStore((s) => s.setLine)

  // Stable name-sorted list for the dropdowns. Refs are an unsorted
  // record server-side; alphabetical here makes the picker scannable.
  const sortedRefs = useMemo(
    () => Object.values(refsMap).sort((a, b) => a.name.localeCompare(b.name)),
    [refsMap],
  )

  const assignment: GameRefAssignment = gameRefs[game.id] ?? {
    head: null,
    lines: Array(TOURNAMENT.linesPerGame).fill(null),
  }
  const playingTeams = teamsPlayingAtSlot(TOURNAMENT, games, game.id)
  // Refs whose own team is playing at this time slot — they're on
  // the field as players, so they can't ref. Same currently-selected
  // exception so an existing assignment doesn't disappear from view.
  const refsPlayingNow = refsBusyAsPlayers(TOURNAMENT, refsMap, games, game.id)
  const takenForHead = refsTakenForSlot(TOURNAMENT, gameRefs, game.id, 'head')

  // Resolve team labels (for the row header).
  const getStar = () => computeStarTeam(TOURNAMENT, games)
  const teamA = resolveTeam(TOURNAMENT, games, game.teamA, getStar) ?? teamLabel(game.teamA)
  const teamB = resolveTeam(TOURNAMENT, games, game.teamB, getStar) ?? teamLabel(game.teamB)

  return (
    <div className="bg-card border rounded-lg p-3 sm:p-4">
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 mb-3 text-sm">
        <div className="text-[0.75rem] uppercase tracking-wider font-extrabold text-muted-foreground">
          <span className="text-foreground">Game {game.id}</span>
          <span> · {game.time} · {game.field}</span>
        </div>
        <div className="text-primary font-semibold">
          {teamA} <span className="text-muted-foreground">v</span> {teamB}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SlotPicker
          label="Head"
          value={encodeHead(assignment.head)}
          empty={!assignment.head}
          onChange={(v) => setHead(game.id, decodeHead(v))}
        >
          <SelectItem value={SENTINEL_NONE}>— Unassigned —</SelectItem>
          <SelectGroup>
            <SelectLabel>Head-eligible refs</SelectLabel>
            {sortedRefs
              .filter((r) => r.headEligible)
              .filter((r) => !takenForHead.has(r.id) || r.id === assignment.head)
              .filter((r) => !refsPlayingNow.has(r.id) || r.id === assignment.head)
              .map((r) => (
                <SelectItem key={r.id} value={`ref:${r.id}`}>
                  {r.name}
                </SelectItem>
              ))}
          </SelectGroup>
        </SlotPicker>

        {assignment.lines.map((slot, idx) => {
          const takenForLine = refsTakenForSlot(TOURNAMENT, gameRefs, game.id, { line: idx })
          return (
            <SlotPicker
              key={idx}
              label={`Line ${idx + 1}`}
              value={encodeSlot(slot)}
              empty={!slot}
              onChange={(v) => setLine(game.id, idx, decodeSlot(v))}
            >
              <SelectItem value={SENTINEL_NONE}>— Unassigned —</SelectItem>
              <SelectGroup>
                <SelectLabel>Refs</SelectLabel>
                {sortedRefs
                  .filter((r) => !takenForLine.has(r.id) || isSlotRef(slot, r.id))
                  .filter((r) => !refsPlayingNow.has(r.id) || isSlotRef(slot, r.id))
                  .map((r) => (
                    <SelectItem key={r.id} value={`ref:${r.id}`}>
                      {r.name}
                      {r.headEligible ? ' ⭐' : ''}
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Volunteer team</SelectLabel>
                {TOURNAMENT.teams
                  .filter((t) => !playingTeams.has(t.name) || isSlotTeam(slot, t.name))
                  .map((t) => (
                    <SelectItem key={t.name} value={`team:${t.name}`}>
                      <span className="inline-flex items-center gap-2">
                        <Swatch team={t.name} size="sm" />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SlotPicker>
          )
        })}
      </div>
    </div>
  )
}

interface SlotPickerProps {
  label: string
  value: string
  empty: boolean
  onChange: (v: string) => void
  children: React.ReactNode
}

function SlotPicker({ label, value, empty, onChange, children }: SlotPickerProps) {
  return (
    <div>
      <div className="text-[0.7rem] uppercase tracking-wider font-extrabold text-muted-foreground mb-1">
        {label}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(empty && 'border-red-300 bg-red-50 text-red-900')}
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

/* ── encode/decode helpers ─────────────────────────────────────────── */

function encodeHead(refId: RefId | null): string {
  return refId ? `ref:${refId}` : SENTINEL_NONE
}
function decodeHead(value: string): RefId | null {
  return value.startsWith('ref:') ? value.slice(4) : null
}

function encodeSlot(slot: LineSlot): string {
  if (!slot) return SENTINEL_NONE
  if ('ref' in slot) return `ref:${slot.ref}`
  return `team:${slot.team}`
}
function decodeSlot(value: string): LineSlot {
  if (value === SENTINEL_NONE) return null
  if (value.startsWith('ref:')) return { ref: value.slice(4) }
  if (value.startsWith('team:')) return { team: value.slice(5) }
  return null
}

function isSlotRef(slot: LineSlot, refId: RefId): boolean {
  return !!slot && 'ref' in slot && slot.ref === refId
}

function isSlotTeam(slot: LineSlot, team: TeamName): boolean {
  return !!slot && 'team' in slot && slot.team === team
}
