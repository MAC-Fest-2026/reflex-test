# Reflex Test — MAC Fest 2026

**A freaky reflex game for fast hands — Math Roast style.** Pick one reflex
challenge, play 10 rounds of that style with the mouse. The UI is loud on
purpose: yellow background, tilted cards, Bungee/Glitch/Creepster fonts,
memes flying everywhere, colour flashes and screen shake — and every round
ends in a meme + its paired sound, brutal about the score, never about the
person. No slurs, no racist content, school-safe.

## Flow

**Lobby** (Among Us-style, glitch title, "LET ME IN" button with the Among
Us start sound) → **challenge grid** (17 cards, loud borders, glitch
titles) → **instruction screen** (3 lines, read aloud by the robot voice
— the user's explicit choice) → **10 rounds** → **result + joke
certificate** → **contenders (best scores)**. The latency self-test is on
the grid screen.

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
- **Color Confusion (Stroop)** — tap the INK colour, not the word. **3 s max
  per round, every round.** Colour count ramps 3 → 4 → 5.
- **Schulte Table** — tap numbers 1–25 in order on a shuffled grid.
- **Flash Crowd** — count the dots in a panel shown for a blink, pick the
  matching number.
- **Spot the New** — a new shape appears among the old ones; tap it.
- **N-Back** — is this letter the same as the one N steps back? (N = 1, then 2.)
- **Value Comparison** — which side is bigger: the number or the count of dots?
- **Mental Flex** — switch rules mid-round (colour vs shape, by the cue).
- **Visual Memory** — study a 3×3 pattern, then rebuild it from memory.
- **Quick Sum** — two numbers flash; type the sum on the keypad.
- **Bubble Sum** — tap the bubbles that add up to the target.
- **Trio** — find the three cards that make a set.
- **Pattern Sequence** — complete the 3×3 pattern (the missing cell).
- **Orbit Tracker** — follow the target ball as the balls orbit, tap it when
  they stop.
- **Digit Memory** — memorise a digit string, then type it back (and its sum).

## Scoring (same as Math Roast, never drifts)

Correct +2, wrong −1, max 20, floor 0. **NOOB rule:** at score exactly 0, a
wrong round keeps the score at 0 and shows a dedicated NOOB meme + sound
(can fire repeatedly).

## Reactions (video memes + sounds, freaky UI)

After every round the overlay pops instantly — no warning before a roast —
shows a video meme in a loud card, plays ONLY that meme's ONE paired mp3
(see `js/memes.js` — one line per meme changes a pairing), and
auto-advances after ~2.4 s. The meme's voice line is the text under it.
Pools are ported **verbatim from Math Roast**: 32 cheering (standard 16 /
comeback 8 / big 8), 42 roasting (mild 17 / harsh 15 / brutal 6 / streak 4),
6 NOOB, 7 timeout (crying chicken + 6, unchanged from the calm build),
1 Windows error screen (3rd consecutive wrong answer, once per session),
2 rainbow horse videos, 18 MLG flyers. The calm text pools in
`js/reactions.js` are the fallback if a meme ever has no voice.

- **Colour flash + shake:** every verdict flashes the page background
  (cheer green/cyan, roast red/purple/pink); a wrong round also shakes the
  screen and bursts 4 memes + 2 swoopers across the page.
- **MLG layer:** 18 flyers (Doritos, Mountain Dew, Illuminati, FaZe, airhorn,
  Doge, thug skull, Snoop, hamster) drift, swoop and jump-pop behind and
  around the game from load — pointer-events none, never blocks a tap.
- **No layered sounds:** a reaction plays ONLY its paired mp3 (plus the
  chicken cry on a timeout loss). There is no siren and no record scratch
  anywhere in this game — layering a second sound over the meme's own sound
  was a bug in Math Roast (the user heard a siren on right and wrong
  answers) and siren-01.mp3 was removed from Math Roast entirely. The
  Windows error screen needs nothing more than its paired XP ding.
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
  gameplay; a meme with no genuine clip plays silent (roast-14 Kermit and
  roast-34 Speed laughing).
- **SpongeBob cap:** exactly 5 SpongeBob memes in the whole pool
  (cheer-11, cheer-12, cheer-13, roast-10, roast-12).

## Files

- `index.html` — lobby / grid / how-to / game / result / latency-test screens
- `css/style.css` — freaky Math Roast look, bundled fonts, no blue tap highlight
- `js/game.js` — session flow, scoring, NOOB rule, reaction overlay,
  instruction narration (SpeechSynthesis, instruction screens only),
  lobby wiring, flash/shake triggers (visual only — no layered sounds)
- `js/challenges.js` — the three original challenges + difficulty ramps
- `js/challenges2.js` — the 14 Braincup-inspired challenges
- `js/reactions.js` — calm cheer / roast / NOOB text lines (fallback voices)
- `js/memes.js` — the meme index: every meme + its ONE paired mp3
  (cheer / roast / NOOB ported verbatim from Math Roast; timeout unchanged)
- `js/feel.js` — the feel engine: meme picking, tiers, chicken cry,
  rainbow horse, airhorn, result music, colour flashes, screen shake,
  MLG floaters/swoopers/jump-pops, Among Us start
- `js/latency.js` — built-in latency self-test panel
- `memes/` — reaction mp4s + their paired mp3s (cheering, roasting,
  timeout, rainbow, mlg; NOOB files live in `roasting/`, Math Roast style)
- `audio/sfx/` — fanfare, cheer, the full pigeon song, airhorn, chicken
  cries, Windows XP error ding, Among Us start
- `fonts/` — Bungee + Rubik Glitch + Creepster (bundled woff2, works offline)

## Latency (this game is a measuring instrument)

- Every gameplay input is `pointerdown`, never `click`.
- Reaction time = `event.timeStamp` vs the `requestAnimationFrame` timestamp
  of the frame that painted the colour change.
- Built-in self-test (grid screen → LATENCY SELF-TEST): 20 clicks.
  **Pass: average ≤ 50 ms, no click over 80 ms.** Fest-day setup: wired
  1000 Hz mouse, same mouse for every player, laptop on mains, no other heavy
  tabs, browser zoom 100%.

## Hosting

GitHub Pages from `main`. Plain HTML/CSS/JS — no framework, no build step,
no backend, no accounts. Best score per challenge (and best/average reaction
time for Color Change Tap) is kept in `localStorage` on the stall laptop.
Keep a downloaded copy of the repo on the fest laptop as the Wi-Fi fallback.
