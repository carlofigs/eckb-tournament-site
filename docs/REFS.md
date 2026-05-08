# Refs guide

Quick read for refs working the day. ~5 minutes to skim.

The site lives at **<https://carlofigs.github.io/kickball-tournament-site/>**. Add it to your home screen if you'll be reffing across multiple games — the page works offline after first load, so a brief signal drop at the field won't lock you out.

---

## 1. Sign in once

1. Open the site on your phone.
2. Top right of the sticky banner there's a 🔒 with "Sign in".
3. Enter the **ref PIN** (the organiser will share it on the day).
4. Pick your name from the dropdown.
5. Done — your phone remembers you across reloads. The lock icon turns green and shows your name.

If your phone keyboard auto-suggests numbers, tap once to focus the PIN field; numbers only.

---

## 2. The "My Games" tab

Once signed in, a **My Games** tab appears next to Home. It shows only the games you're refereeing, sorted by start time, with a coloured strip on top of each card telling you your role:

- **★ Head** (green strip) — you call the game and **enter the score**.
- **Line 1** / **Line 2** (grey strip) — you make line calls. You don't input scores.

Top of the page also shows a count: *"3 games assigned · 1 done · 2 to go"*.

---

## 3. Entering scores (head ref only)

Only the **head ref of a game** can input scores. Line refs and team-volunteer fill-ins see read-only score boxes — that's intentional, not a bug. If you're head:

1. Open **My Games** (or **Schedule** — they're the same data, just filtered).
2. Find your game's card.
3. Tap a score box. Type. Tab/move to the other team. Type. That's it — saved automatically.
4. The score syncs to every other phone (organisers, players watching the bracket, etc.) within ~1 second. Up Next, Bracket, Standings all update.

**Mistakes are fine.** Tap the box again, change the number. Same auto-save. There's no "submit" button.

---

## 4. What "L1", "L7" etc. mean on the QF cards

QF games have line ref slots labelled **L1 – L7**. That's "loser of round 1 game N":

- **L1** = the team that lost Game 1 → a player from that team line-refs Game 9.
- **L2** = loser of Game 2 → line-refs Game 9 (line 2).
- ...
- **L7** = loser of Game 7 → line-refs Game 12 (line 2).

The site fills these in automatically as R1 results land. You don't need to do anything — the badges just appear.

---

## 5. The Star team and Kirk Davies

After all 7 R1 games are scored, one of the losers becomes the **Star team** — the best-performing R1 loser, who advances to play Game 12.

Whoever the Star is, they can't volunteer-ref because they're playing. **Kirk Davies steps in for them.** This is automatic — if (say) Pink turn out to be the Star, the QF card that would have shown "Pink (L1)" instead shows "Kirk Davies".

If Kirk's busy elsewhere or the substitution looks wrong, organiser can override — see section 8.

---

## 6. Volunteer team

Some line slots are labelled **Volunteer: <Team Name>** with a coloured swatch. That means a player from that team will fill in. The site filters out teams that are themselves playing concurrently, so you won't be asked to find a Yellow player while Yellow is on the field.

If your team is up as a volunteer and nobody steps forward, **flag the head ref** — they'll handle it.

---

## 7. The sticky banner up top

The black bar at the top of the screen shows three things:

- **Up Next** — the next time slot's games (e.g. *"2:30 pm · Quarter Finals · 4 concurrent games"*). Updates as scores land.
- **Status dot** — green = synced, amber = reconnecting, red = sync error. If it goes red, scores you're entering still save locally; they reconcile when sync resumes.
- **🔒 / 🔓** — your sign-in state. Tap to sign out or change role.

Pinned at the very top: a thin rainbow Pride stripe. Decorative.

---

## 8. If something looks wrong

- **Wrong team in a QF slot?** The line-ref defaults resolve from R1 results. If R1 isn't complete yet, slots show "L1: pending" or similar. Once R1 lands, they fill in.
- **Score didn't save?** Check the status dot. Red = sync down. Score is still in your phone's memory; it'll push when network returns. If you really need to confirm, the organiser can read it off their phone.
- **Wrong head ref name on your card?** Tell the organiser; they fix it on the **Refs** tab (organiser-only).
- **Page won't load / weird state?** Pull-to-refresh. The page caches aggressively but a refresh always fetches fresh data from the server.

---

## 9. End of the day

You don't need to do anything to "sign off". The organiser exports the final state at the end. Your localStorage cache lives until you clear browser data or come back next tournament — your sign-in survives between visits.

---

## Quick reference

| Task                | Where                                      |
|---------------------|--------------------------------------------|
| Sign in / out       | 🔒 button, top right of sticky banner      |
| See your games      | **My Games** tab (only visible to refs)    |
| Enter a score       | **My Games** or **Schedule** → tap a box   |
| See current standings | **Standings** tab                        |
| See who's in the SF / Final | **Bracket** tab                    |
| Find the announcement | **Home** tab — banner above the hero     |

Questions on the day, find the head organiser. Have a good tournament.
