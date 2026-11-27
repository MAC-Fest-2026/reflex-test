# Reflex Test — MAC Fest 2026

**A calm reflex game for fast hands — with a freaky feel.** Pick one reflex
challenge, play 10 rounds of that style with the mouse. The UI stays calm
lofi (warm paper, soft sage, dusty blue, terracotta), but every round ends
in a meme + its paired sound, brutal about the score, never about the
person. No slurs, no racist content, school-safe.

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
wrong round keeps the score at 0 and shows a dedicated NOOB meme + sound
(can fire repeatedly).

## Reactions (memes + sounds, calm UI)

After every round the overlay shows a meme image/video in the same calm
card, plays ONLY that meme's ONE paired mp3 (see `js/memes.js` — one line
per meme changes a pairing), and auto-advances after ~2.4 s. The meme's
voice line is the text under it; the calm text pools in `js/reactions.js`
are the fallback if a meme ever has no voice. Pools: 16 cheering
(standard / comeback / big), 24 roasting (mild / harsh / brutal / streak),
6 NOOB, 7 timeout (crying chicken + 6), 1 Windows error screen (3rd
consecutive wrong answer, once per session), 2 rainbow horse videos.

- **Timeouts** show `TIME'S UP!` with the crying-chicken cry, escalating by
  consecutive losses: 1st ~1 s @ 0.7 volume, 2nd ~2 s @ 0.85, 3rd ~3 s @ 1.0,
  4th+ the LOUD "WAH" (6 s).
- **Rainbow horse:** a correct answer in under 2 s, or finishing the whole
  session in under 60 s, flies Pancake the hamster on a unicorn across the
  screen (~1.8 s, pointer-events none). Airhorn on a 3-correct streak and on
  a great finish.
- **Result music by band:** 15–19 fanfare, 10–14 cheer, 0–9 the FULL "One
  Little Pigeon" song (2:10, `audio/sfx/pigeon-full.mp3`) — it plays through
  until the player leaves the result screen.
- **Instruction narration:** when a game's instruction screen opens (first
  pick or mid-game "How to play"), its 3 instruction lines are read aloud
  with the robot voice (SpeechSynthesis) — the user's explicit choice, and
  the ONLY TTS in the game. It stops the moment START is pressed, the
  screen closes, or the player navigates away. No TTS in reactions or
  gameplay; a meme with no genuine clip plays silent.
- **SpongeBob cap:** exactly 5 SpongeBob memes in the whole pool.
- **Balance:** Color Confusion (Stroop) is capped at 3 seconds per round
  for every round; the difficulty ramp is the colour count (3 → 4 → 5).

## Files

- `index.html` — start / game / result / latency-test screens
- `css/style.css` — calm lofi look, bundled fonts, no blue tap highlight
- `js/game.js` — session flow, scoring, NOOB rule, reaction overlay,
  instruction narration (SpeechSynthesis, instruction screens only)
- `js/challenges.js` — the three original challenges + difficulty ramps
- `js/challenges2.js` — the 14 Braincup-inspired challenges
- `js/reactions.js` — calm cheer / roast / NOOB text lines (fallback voices)
- `js/memes.js` — the meme index: every meme + its ONE paired mp3
- `js/feel.js` — the feel engine: meme picking, tiers, chicken cry,
  rainbow horse, airhorn, result music
- `js/latency.js` — built-in latency self-test panel
- `memes/` — reaction GIFs/mp4s + their paired mp3s (cheering, roasting,
  timeout, rainbow; NOOB files live in `roasting/`, Math Roast style)
- `audio/sfx/` — fanfare, cheer, the full pigeon song, airhorn, chicken
  cries, Windows XP error ding
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
