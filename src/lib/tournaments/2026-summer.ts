import type { Tournament } from '@/lib/schemas'

/**
 * Summer 2026 tournament — committed config.
 *
 * Edit before the day. The shape is enforced by `Tournament`; if you
 * add fields, update `lib/schemas.ts` first so every consumer keeps
 * compiling.
 *
 * GAME NUMBERING: Game 8 is intentionally skipped — the schedule
 * template was originally built for 16 teams (Game 8 was a R1
 * matchup). With 14 teams the Star team takes the slot that would
 * have been Game 8's winner, in Game 12. Numbering stays 1–7, 9–15
 * for continuity with the ref group chat schedule.
 */
export const summer2026: Tournament = {
  id: 'summer-2026',
  title: 'Summer 2026 Kickball Tournament',
  dateLabel: 'Sunday · 10 May 2026',

  teams: [
    // Alphabetical so the Teams grid + every dropdown that pulls from
    // `tournament.teams` (volunteer slots, roster editor's team
    // picker) is scannable in one pass. Game definitions reference
    // teams by name, not by index — reordering here is presentation
    // only.
    { name: 'Apple',     colour: '#84CC16' },
    { name: 'Baby Blue', colour: '#89CFF0' },
    { name: 'Black',     colour: '#1F2937' },
    { name: 'Blue',      colour: '#1E40AF' },
    { name: 'Chocolate', colour: '#78350F' },
    { name: 'Green',     colour: '#16A34A' },
    { name: 'Hay',       colour: '#DAA520' },
    { name: 'Lilac',     colour: '#C8A2C8' },
    { name: 'Orange',    colour: '#F97316' },
    { name: 'Pink',      colour: '#EC4899' },
    { name: 'Purple',    colour: '#9333EA' },
    { name: 'Red',       colour: '#B91C1C' },
    { name: 'Teal',      colour: '#0D9488' },
    { name: 'Yellow',    colour: '#FACC15' },
  ],

  rounds: {
    R1: 'Round 1',
    QF: 'Quarter Finals',
    SF: 'Semi Finals',
    F:  'Final',
  },

  timeSlots: [
    { time: '12:00 pm', info: { label: 'Fields set-up' } },
    { time: '12:45 pm', info: { label: 'Huddle' } },
    { time: '1:00 pm' },
    { time: '1:45 pm' },
    { time: '2:30 pm' },
    { time: '3:15 pm' },
    { time: '4:00 pm' },
  ],

  // Fixtures are now loaded from public.games in Supabase at runtime.
  // This array is intentionally empty — it was replaced as part of the
  // GRIMMERIE migration (feat/grimmerie-games-read-path). The store's
  // setFixtures action populates the fixture data once the query resolves.
  games: [],

  // Roster compiled from the league's first 6 games of refereeing
  // history. Sorted alphabetically for scannability. Head-eligibility
  // mirrors who has actually run the plate at least once across that
  // history; everyone else is line-only.
  //
  // The live DB is the source of truth — this list only seeds an
  // empty DB on first run. After seeding (or any in-app edit), changes
  // happen via the Refs page roster editor.
  refs: [
    { id: 'r1',  name: "Aaron O'Meara",       headEligible: false },
    { id: 'r2',  name: 'Andy Eisenberg',      headEligible: true  },
    { id: 'r3',  name: 'Anthony Phan',        headEligible: false },
    { id: 'r4',  name: 'Ben Woodlock',        headEligible: true  },
    { id: 'r5',  name: 'Cameron Sidious',     headEligible: true  },
    { id: 'r6',  name: 'Carlo Figueroa',      headEligible: false },
    { id: 'r7',  name: 'Dan Walton',          headEligible: false },
    { id: 'r8',  name: 'Jack Foulstone',      headEligible: false },
    { id: 'r9',  name: 'Josh Grolman',        headEligible: true  },
    { id: 'r10', name: 'Justin Koonin',       headEligible: true  },
    { id: 'r11', name: 'Lachlan Pedan',       headEligible: true  },
    { id: 'r12', name: 'Laurence Barber',     headEligible: true  },
    { id: 'r13', name: 'Scott Paschke',       headEligible: true  },
    { id: 'r14', name: 'Steven Intervention', headEligible: true  },
    { id: 'r15', name: 'Tom Elphick',         headEligible: false },
    { id: 'r16', name: 'Zack Krause',         headEligible: true  },
    // Reserve ref used when a QF line-slot's `loserOf` resolves to
    // the Star team (who's busy playing Game 12). See
    // `starSubstituteRefId` below.
    { id: 'r17', name: 'Kirk Davies',         headEligible: false },
  ],

  linesPerGame: 2,

  // Edit before tournament day. The Ref PIN unlocks scoring on a ref's
  // assigned games only; the Organiser PIN unlocks everything + the
  // Refs management tab + admin tools.
  pins: {
    ref: '4837',
    organiser: '7261',
  },

  // When a QF line-slot's `{ loserOf: G }` resolves to the Star team,
  // substitute Kirk Davies — the Star is busy playing Game 12 across
  // the same slot, so they can't volunteer-ref.
  starSubstituteRefId: 'r17',
}
