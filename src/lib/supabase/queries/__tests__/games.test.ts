import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseTeamRef, fetchTournamentGames } from '../games'

// ── parseTeamRef (pure — no mock needed) ────────────────────────────

describe('parseTeamRef', () => {
  it('R1 row: literal team name returns the string', () => {
    expect(parseTeamRef('Pink', null)).toBe('Pink')
  })

  it('R1 row: literal name takes precedence even if ref is present', () => {
    expect(parseTeamRef('Baby Blue', { winnerOf: 3 })).toBe('Baby Blue')
  })

  it('QF/SF/F row: winnerOf ref', () => {
    expect(parseTeamRef(null, { winnerOf: 1 })).toEqual({ winnerOf: 1 })
  })

  it('game 12 teamB: star ref', () => {
    expect(parseTeamRef(null, { star: true })).toEqual({ star: true })
  })

  it('throws when both literal and ref are null', () => {
    expect(() => parseTeamRef(null, null)).toThrow('Cannot parse TeamRef')
  })

  it('throws when ref is an empty object (no recognised key)', () => {
    expect(() => parseTeamRef(null, {})).toThrow('Cannot parse TeamRef')
  })
})

// ── fetchTournamentGames (mocked supabase) ───────────────────────────

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

/** Build a chainable Supabase query mock that resolves to { data, error }. */
function mockQuery(data: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data, error }),
  }
  vi.mocked(supabase!.from).mockReturnValue(chain as never)
  return chain
}

const R1_ROWS = [
  { game_number: 1, round: 'R1', scheduled_time: '1:00 pm', field: 'Road',
    team_a: 'Baby Blue', team_b: 'Pink', team_a_ref: null, team_b_ref: null },
  { game_number: 2, round: 'R1', scheduled_time: '1:00 pm', field: 'Middle',
    team_a: 'Lilac', team_b: 'Green', team_a_ref: null, team_b_ref: null },
]

const KO_ROWS = [
  { game_number: 9,  round: 'QF', scheduled_time: '2:30 pm', field: 'Road',
    team_a: null, team_b: null,
    team_a_ref: { winnerOf: 1 }, team_b_ref: { winnerOf: 2 } },
  { game_number: 12, round: 'QF', scheduled_time: '2:30 pm', field: 'Water',
    team_a: null, team_b: null,
    team_a_ref: { winnerOf: 7 }, team_b_ref: { star: true } },
]

describe('fetchTournamentGames', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps R1 rows to Games with literal TeamRefs', async () => {
    mockQuery(R1_ROWS)
    const games = await fetchTournamentGames('summer-2026')

    expect(games).toHaveLength(2)
    expect(games[0]).toEqual({
      id: 1, round: 'R1', time: '1:00 pm', field: 'Road',
      teamA: 'Baby Blue', teamB: 'Pink',
    })
    expect(games[1]).toEqual({
      id: 2, round: 'R1', time: '1:00 pm', field: 'Middle',
      teamA: 'Lilac', teamB: 'Green',
    })
  })

  it('maps KO rows to Games with dynamic TeamRefs', async () => {
    mockQuery(KO_ROWS)
    const games = await fetchTournamentGames('summer-2026')

    expect(games[0]).toEqual({
      id: 9, round: 'QF', time: '2:30 pm', field: 'Road',
      teamA: { winnerOf: 1 }, teamB: { winnerOf: 2 },
    })
    expect(games[1]).toEqual({
      id: 12, round: 'QF', time: '2:30 pm', field: 'Water',
      teamA: { winnerOf: 7 }, teamB: { star: true },
    })
  })

  it('queries with correct filters and ordering', async () => {
    const chain = mockQuery(R1_ROWS)
    await fetchTournamentGames('summer-2026')

    expect(supabase!.from).toHaveBeenCalledWith('games')
    expect(chain.eq).toHaveBeenCalledWith('context_type', 'tournament')
    expect(chain.eq).toHaveBeenCalledWith('context_id', 'summer-2026')
    expect(chain.order).toHaveBeenCalledWith('game_number')
  })

  it('throws when the query returns an error', async () => {
    mockQuery([], { message: 'relation "games" does not exist' })
    await expect(fetchTournamentGames('summer-2026')).rejects.toMatchObject({
      message: 'relation "games" does not exist',
    })
  })
})
