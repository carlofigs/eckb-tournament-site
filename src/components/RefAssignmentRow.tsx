import { useMemo } from 'react'
import type { Game, GameRefAssignment, LineSlot, RefId, TeamName } from '@/lib/schemas'
import { TOURNAMENT } from '@/lib/tournament'
import { useTournamentStore } from '@/store/tournament'
import {
  refsBusyAsPlayers,
  refsTakenForSlot,
  resolveLineSlot,
  teamsPlayingAtSlot,
} from '@/lib/refs'
import { resolveTeam, teamLabel } from '@/lib/games'
import { computeStarTeam } from '@/lib/star'
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
   "Unassigned / use default" option. */
const SENTINEL_NONE = '__none__'

interface RefAssignmentRowProps {
  game: Game
}

export function RefAssignmentRow({ game }: RefAssignmentRowProps) {
  const games    = useTournamentStore((s) => s.games)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const gameRefs = useTournamentStore((s) => s.gameRefs)
  const refsMap  = useTournamentStore((s) => s.refs)
  const setHead  = useTournamentStore((s) => s.setHead)
  const setLine  = useTournamentStore((s) => s.setLine)

  const sortedRefs = useMemo(
    () => Object.values(refsMap).sort((a, b) => a.name.localeCompare(b.name)),
    [refsMap],
  )

  const assignment: GameRefAssignment = gameRefs[game.id] ?? {
    head: null,
    lines: Array(TOURNAMENT.linesPerGame).fill(null),
  }
  const t = { ...TOURNAMENT, games: fixtures }
  const playingTeams = teamsPlayingAtSlot(t, games, game.id)
  const refsPlayingNow = refsBusyAsPlayers(t, refsMap, games, game.id)
  const takenForHead = refsTakenForSlot(t, games, gameRefs, game.id, 'head')

  const getStar = () => computeStarTeam(t, games)
  const teamA = resolveTeam(t, games, game.teamA, getStar) ?? teamLabel(game.teamA)
  const teamB = resolveTeam(t, games, game.teamB, getStar) ?? teamLabel(game.teamB)

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

        {Array.from({ length: TOURNAMENT.linesPerGame }, (_, idx) => {
          const stored = assignment.lines[idx] ?? null
          const defaultSlot = game.defaultLines?.[idx] ?? null
          const resolvedDefault = defaultSlot
            ? resolveLineSlot(TOURNAMENT, games, defaultSlot)
            : null
          const defaultLabel = describeDefault(defaultSlot, resolvedDefault, refsMap)
          // Slot is "empty" only when there's no override AND no
          // default produces a value. Suppresses the red border on
          // L1-L7 slots that auto-fill from R1 results.
          const isEmpty = !stored && !resolvedDefault
          const takenForLine = refsTakenForSlot(
            TOURNAMENT,
            games,
            gameRefs,
            game.id,
            { line: idx },
          )
          return (
            <SlotPicker
              key={idx}
              label={`Line ${idx + 1}`}
              value={encodeSlot(stored)}
              empty={isEmpty}
              onChange={(v) => setLine(game.id, idx, decodeSlot(v))}
            >
              <SelectItem value={SENTINEL_NONE}>
                {defaultLabel ? `— Default: ${defaultLabel} —` : '— Unassigned —'}
              </SelectItem>
              <SelectGroup>
                <SelectLabel>Refs</SelectLabel>
                {sortedRefs
                  .filter((r) => !takenForLine.has(r.id) || isSlotRef(stored, r.id))
                  .filter((r) => !refsPlayingNow.has(r.id) || isSlotRef(stored, r.id))
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
                  .filter((t) => !playingTeams.has(t.name) || isSlotTeam(stored, t.name))
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
  if ('team' in slot) return `team:${slot.team}`
  // {loserOf} should never be stored via the editor, only configured
  // as a default — but defend against unexpected storage.
  return SENTINEL_NONE
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

/** Human label for the SelectItem that represents "use the default". */
function describeDefault(
  def: LineSlot,
  resolved: ReturnType<typeof resolveLineSlot>,
  refsMap: Record<RefId, { id: RefId; name: string }>,
): string | null {
  if (!def) return null
  // Prefix loserOf defaults as "Lk" so refs / organisers recognise
  // the convention from the league spreadsheet.
  const prefix = 'loserOf' in def ? `L${def.loserOf}: ` : ''
  if (!resolved) return prefix ? `${prefix}pending` : null
  if ('ref' in resolved) {
    const r = refsMap[resolved.ref]
    return `${prefix}${r?.name ?? 'Unknown ref'}`
  }
  return `${prefix}${resolved.team}`
}
