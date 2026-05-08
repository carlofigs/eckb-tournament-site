import { describe, it, expect } from 'vitest'
import {
  canEditScore,
  effectiveLines,
  getRefRoleInGame,
  refsAtSameSlot,
  refsBusyAsPlayers,
  refsTakenForSlot,
  resolveLineSlot,
  teamsPlayingAtSlot,
} from '@/lib/refs'
import { TEST_TOURNAMENT } from '@/lib/__fixtures__/tournament'
import type {
  AuthState,
  GameId,
  GameRefAssignment,
  GameScore,
  Ref,
} from '@/lib/schemas'

const REFS_MAP: Record<string, Ref> = {}
for (const r of TEST_TOURNAMENT.refs) REFS_MAP[r.id] = r

const EMPTY: Record<GameId, GameScore> = {}

describe('getRefRoleInGame', () => {
  it('reports head, line 1, line 2, or null', () => {
    const gameRefs: Record<GameId, GameRefAssignment> = {
      1: { head: 'r1', lines: [{ ref: 'r2' }, { team: 'T3' }] },
    }
    expect(getRefRoleInGame(TEST_TOURNAMENT, EMPTY, gameRefs, 1, 'r1')).toBe('Head')
    expect(getRefRoleInGame(TEST_TOURNAMENT, EMPTY, gameRefs, 1, 'r2')).toBe('Line 1')
    expect(getRefRoleInGame(TEST_TOURNAMENT, EMPTY, gameRefs, 1, 'r3')).toBeNull()
  })

  it('finds line 2 when only line 1 is unset', () => {
    const gameRefs: Record<GameId, GameRefAssignment> = {
      1: { head: null, lines: [null, { ref: 'r4' }] },
    }
    expect(getRefRoleInGame(TEST_TOURNAMENT, EMPTY, gameRefs, 1, 'r4')).toBe('Line 2')
  })
})

describe('refsAtSameSlot', () => {
  it('excludes the current game and only counts concurrent ones', () => {
    const gameRefs: Record<GameId, GameRefAssignment> = {
      1: { head: 'r5', lines: [null, null] },
      2: { head: 'r1', lines: [{ ref: 'r4' }, null] },
      5: { head: 'r2', lines: [null, null] },
    }
    const conflicts = refsAtSameSlot(TEST_TOURNAMENT, EMPTY, gameRefs, 1)
    expect(conflicts.has('r1')).toBe(true)
    expect(conflicts.has('r4')).toBe(true)
    expect(conflicts.has('r5')).toBe(false) // own game
    expect(conflicts.has('r2')).toBe(false) // different time slot
  })
})

describe('refsTakenForSlot', () => {
  it('also excludes the current game OTHER slots when filtering one slot', () => {
    const gameRefs: Record<GameId, GameRefAssignment> = {
      1: { head: 'r1', lines: [{ ref: 'r2' }, null] },
    }
    const forHead = refsTakenForSlot(TEST_TOURNAMENT, EMPTY, gameRefs, 1, 'head')
    expect(forHead.has('r2')).toBe(true)
    expect(forHead.has('r1')).toBe(false)

    const forLine0 = refsTakenForSlot(TEST_TOURNAMENT, EMPTY, gameRefs, 1, { line: 0 })
    expect(forLine0.has('r1')).toBe(true)
    expect(forLine0.has('r2')).toBe(false)
  })
})

describe('teamsPlayingAtSlot', () => {
  it('collects every team across concurrent games', () => {
    const teams = teamsPlayingAtSlot(TEST_TOURNAMENT, {}, 1)
    expect(teams.has('T1')).toBe(true)
    expect(teams.has('T8')).toBe(true)
    expect(teams.has('T9')).toBe(false)
  })
})

describe('refsBusyAsPlayers', () => {
  it('filters refs whose team is on the field at this time slot', () => {
    const busy = refsBusyAsPlayers(TEST_TOURNAMENT, REFS_MAP, {}, 1)
    expect(busy.has('r3')).toBe(true) // r3 plays for T1
    expect(busy.has('r5')).toBe(true) // r5 plays for T5
    expect(busy.has('r1')).toBe(false) // r1 has no team
  })
})

describe('canEditScore', () => {
  const gameRefs: Record<GameId, GameRefAssignment> = {
    1: { head: 'r1', lines: [{ ref: 'r2' }, null] },
    2: { head: null, lines: [null, null] },
  }

  it('organiser can edit any game', () => {
    const auth: AuthState = { role: 'organiser', refId: null }
    expect(canEditScore(auth, gameRefs, 1)).toBe(true)
    expect(canEditScore(auth, gameRefs, 2)).toBe(true)
  })

  it('head ref can edit, line refs cannot', () => {
    expect(canEditScore({ role: 'ref', refId: 'r1' }, gameRefs, 1)).toBe(true)
    expect(canEditScore({ role: 'ref', refId: 'r2' }, gameRefs, 1)).toBe(false)
  })

  it('ref not assigned to a game cannot edit it', () => {
    expect(canEditScore({ role: 'ref', refId: 'r1' }, gameRefs, 2)).toBe(false)
  })

  it('player can never edit', () => {
    expect(canEditScore({ role: 'player', refId: null }, gameRefs, 1)).toBe(false)
  })

  it('volunteer-team line slot does NOT grant edit access', () => {
    const refs: Record<GameId, GameRefAssignment> = {
      1: { head: null, lines: [{ team: 'T3' }, null] },
    }
    expect(canEditScore({ role: 'ref', refId: 'r3' }, refs, 1)).toBe(false)
  })
})

/* ── Default + loserOf resolution ───────────────────────────────────── */

describe('effectiveLines + resolveLineSlot', () => {
  it('falls back to defaults when stored is null', () => {
    // TEST_TOURNAMENT has no defaultLines, so build a fixture that does
    const t = {
      ...TEST_TOURNAMENT,
      games: TEST_TOURNAMENT.games.map((g) =>
        g.id === 9
          ? { ...g, defaultLines: [{ loserOf: 1 }, { loserOf: 2 }] }
          : g,
      ),
    }
    const gameRefs: Record<GameId, GameRefAssignment> = {
      9: { head: null, lines: [null, null] },
    }
    const lines = effectiveLines(t, gameRefs, 9)
    expect(lines).toEqual([{ loserOf: 1 }, { loserOf: 2 }])
  })

  it('stored override beats default', () => {
    const t = {
      ...TEST_TOURNAMENT,
      games: TEST_TOURNAMENT.games.map((g) =>
        g.id === 9
          ? { ...g, defaultLines: [{ loserOf: 1 }, { loserOf: 2 }] }
          : g,
      ),
    }
    const gameRefs: Record<GameId, GameRefAssignment> = {
      9: { head: null, lines: [{ ref: 'r1' }, null] },
    }
    const lines = effectiveLines(t, gameRefs, 9)
    expect(lines[0]).toEqual({ ref: 'r1' })
    expect(lines[1]).toEqual({ loserOf: 2 })
  })

  it('resolves { loserOf: G } to the team that lost G', () => {
    const scores: Record<GameId, GameScore> = { 1: { scoreA: 5, scoreB: 3 } }
    expect(resolveLineSlot(TEST_TOURNAMENT, scores, { loserOf: 1 })).toEqual({
      team: 'T2',
    })
  })

  it('resolves to null until the loser game is decided', () => {
    expect(resolveLineSlot(TEST_TOURNAMENT, EMPTY, { loserOf: 1 })).toBeNull()
  })

  it('substitutes the Star team with the configured ref', () => {
    // R1 with T2 as the smallest-margin loser → Star = T2
    const scores: Record<GameId, GameScore> = {
      1: { scoreA: 5, scoreB: 3 }, // T2 loses by 2
      2: { scoreA: 9, scoreB: 0 }, // T4 loses by 9
      3: { scoreA: 9, scoreB: 0 },
      4: { scoreA: 9, scoreB: 0 },
      5: { scoreA: 9, scoreB: 0 },
      6: { scoreA: 9, scoreB: 0 },
      7: { scoreA: 9, scoreB: 0 },
    }
    const t = { ...TEST_TOURNAMENT, starSubstituteRefId: 'r-kirk' }
    expect(resolveLineSlot(t, scores, { loserOf: 1 })).toEqual({
      ref: 'r-kirk',
    })
    // L4 didn't become Star, so still resolves to the team
    expect(resolveLineSlot(t, scores, { loserOf: 2 })).toEqual({
      team: 'T4',
    })
  })

  it('falls back to team when no starSubstituteRefId is configured', () => {
    const scores: Record<GameId, GameScore> = {
      1: { scoreA: 5, scoreB: 3 },
      2: { scoreA: 9, scoreB: 0 },
      3: { scoreA: 9, scoreB: 0 },
      4: { scoreA: 9, scoreB: 0 },
      5: { scoreA: 9, scoreB: 0 },
      6: { scoreA: 9, scoreB: 0 },
      7: { scoreA: 9, scoreB: 0 },
    }
    // T2 is the Star but no substitute ref configured → still shows team
    expect(resolveLineSlot(TEST_TOURNAMENT, scores, { loserOf: 1 })).toEqual({
      team: 'T2',
    })
  })
})

describe('Star-sub does NOT grant edit access (lines never do)', () => {
  it('Kirk lands in a line slot via Star sub but cannot edit the score', () => {
    // Even when the loserOf default resolves to Kirk's ref id, that's
    // a LINE assignment — head-only rule applies.
    const gameRefs: Record<GameId, GameRefAssignment> = {
      9: { head: null, lines: [null, null] },
    }
    expect(canEditScore({ role: 'ref', refId: 'r-kirk' }, gameRefs, 9)).toBe(false)
  })
})
