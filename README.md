# Reflex Test — MAC Fest 2026

**The Math Roast game, rebuilt for fast hands instead of fast maths.** Same look,
same scoring, same meme roasts and cheers — no questions. Pick one reflex
challenge, play 10 rounds of that style with the mouse, and every round ends
in a cheer or a roast.

## Challenges (pick 1, play 10 rounds)

- **Memory Blocks** — blocks light up in a sequence on a 3×3 grid; click them
  back in the same order within 10 s. Rounds 1–3: 3 blocks, 4–6: 4, 7–8: 5,
  9–10: 6 blocks lit faster (~450 ms each).
- **Odd One Out** — a 4×3 grid of shapes, exactly one different in size or
  shape; click it. 5 s per round. The difference shrinks round by round.
- **Color Change Tap** — a panel sits red, turns green at a random moment
  (1.5–5 s). Click within 600 ms of the change = correct. False start, slower
  than 600 ms, or no click within 2 s = wrong. Your time in ms shows every round.

## Scoring (same as Math Roast, never drifts)

Correct +2, wrong −1, max 20, floor 0. **NOOB rule:** at score exactly 0, a
wrong round keeps the score at 0 and fires a dedicated NOOB meme + voice.

## Files

- `index.html` — start / game / result / latency-test screens
- `css/style.css` — freaky MLG look, bundled fonts, no blue tap highlight
- `js/game.js` — session flow, scoring, NOOB rule, reaction overlay
- `js/challenges.js` — the three challenges + difficulty ramps
- `js/memes.js` — meme index (same pack as Math Roast, 1-to-1 meme↔sound)
- `js/latency.js` — built-in latency self-test panel
- `memes/cheering/`, `memes/roasting/` — meme pack (32 cheers, 42 roasts, 6 NOOBs)
- `fonts/` — Bungee, Rubik Glitch, Creepster (bundled, works offline)

## Meme rules

One line per meme in `js/memes.js`: `{ file, voice, audio }`. The video shows,
its ONE paired mp3 plays — never a random sound. `audio: null` plays silent.
No text-to-speech anywhere. Adding a meme = drop the file in the folder and
add one line to the index.

## Latency (this game is a measuring instrument)

- Every gameplay input is `pointerdown`, never `click`.
- Reaction time = `event.timeStamp` vs the `requestAnimationFrame` timestamp
  of the frame that painted the colour change.
- Built-in self-test (start screen → LATENCY SELF-TEST): 20 clicks.
  **Pass: average ≤ 50 ms, no click over 80 ms.** Fest-day setup: wired
  1000 Hz mouse, same mouse for every player, laptop on mains, no other heavy
  tabs, browser zoom 100%.

## Hosting

GitHub Pages from `main`. Plain HTML/CSS/JS — no framework, no build step,
no backend, no accounts. Best score per challenge (and best/average reaction
time for Color Change Tap) is kept in `localStorage` on the stall laptop.
Keep a downloaded copy of the repo on the fest laptop as the Wi-Fi fallback.
