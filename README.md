# Reflex Test — MAC Fest 2026

**A calm reflex game for fast hands.** Pick one reflex challenge, play
10 rounds of that style with the mouse, and every round ends in a quiet
cheer or a gentle roast — as text only. No memes, no sounds, no shouting.
Warm paper, soft sage, dusty blue, terracotta.

## Challenges (pick 1, play 10 rounds)

- **Memory Blocks** — blocks light up in a sequence on a 3×3 grid; click them
  back in the same order within 10 s. Rounds 1–3: 3 blocks, 4–6: 4, 7–8: 5,
  9–10: 6 blocks lit faster (~450 ms each).
- **Odd One Out** — a 4×3 grid of shapes, exactly one different in size or
  shape; click it. 5 s per round. The difference shrinks round by round.
- **Color Change Tap** — a panel sits dusty blue, turns sage green at a random
  moment (1.5–5 s). Click within 600 ms of the change = correct. False start,
  slower than 600 ms, or no click within 2 s = wrong. Your time in ms shows
  every round.

## Scoring (same as Math Roast, never drifts)

Correct +2, wrong −1, max 20, floor 0. **NOOB rule:** at score exactly 0, a
wrong round keeps the score at 0 and shows a calm NOOB text line.

## Reactions (text only)

After every round the overlay fades in gently with a short line of text and
the score change (+2, −1, or "stays at 0"). The lines live in
`js/reactions.js` — one random line per round, never the same twice in a row.
No images, no video, no audio, no text-to-speech anywhere.

## Files

- `index.html` — start / game / result / latency-test screens
- `css/style.css` — calm lofi look, bundled fonts, no blue tap highlight
- `js/game.js` — session flow, scoring, NOOB rule, reaction overlay
- `js/challenges.js` — the three challenges + difficulty ramps
- `js/reactions.js` — calm cheer / roast / NOOB text lines
- `js/latency.js` — built-in latency self-test panel
- `fonts/` — Quicksand + Fraunces (bundled woff2, works offline)

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
