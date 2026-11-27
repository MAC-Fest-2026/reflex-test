// Reflex Test — reaction text lines (no memes, no audio; the game is silent).
// After each round the overlay shows one calm line from the matching pool,
// plus the score change. pickLine(pool, lastLine) -> { line, lastLine }:
// a random line, never the same one twice in a row in a session.
// The NOOB pool fires when the score is exactly 0 and a round is wrong
// (PRD §4) — every line carries the word NOOB, as plain text, no voice.
(function (global) {
  'use strict';

  var REACTION_LINES = {
    cheering: [
      'Clean. That was quick.',
      'Smooth hands. Nicely done.',
      'Right on it. Take the +2.',
      'Calm and quick — a good pair.',
      'That one landed softly. +2.',
      'Steady. Sharp. Correct.',
      'A quiet little win.',
      'Well timed. Well played.',
      'You were ready for that one.',
      'Nice — right answer, no fuss.'
    ],
    roasting: [
      'That one slipped away. −1.',
      'Close, but the moment passed.',
      'A little slow on that one.',
      'Not this time. The point goes away.',
      'The round wins this one.',
      'Off by a beat. −1.',
      'That was the wrong one, gently noted.',
      'A miss. It happens — −1.',
      'Your hand hesitated. The round did not.',
      'Nope. The score leans the other way.'
    ],
    noob: [
      'NOOB — the score stays at 0. Breathe. Try again.',
      'Certified NOOB for this round. Still 0. Still fine.',
      'NOOB. Nothing lost, nothing gained.',
      'A NOOB round. The score holds at 0.',
      'NOOB — the scoreboard shrugs and stays at 0.',
      'A NOOB round, served gently. Still 0.'
    ]
  };

  // Per-game lines: a little flavour for each challenge. A game without its
  // own pool falls back to the global lines above.
  var BY_GAME = {
    memory: {
      cheering: ['That sequence never stood a chance.', 'Your memory just showed off.'],
      roasting: ['The blocks outplayed you that time.', 'One block too many to hold.']
    },
    odd: {
      cheering: ['Sharp eyes. That odd one had nowhere to hide.', 'Spotted in a blink.'],
      roasting: ['The odd one waved and you missed it.', 'So close — the odd one was right there.']
    },
    color: {
      cheering: ['Lightning finger. That was fast.', 'You pounced the instant it turned.'],
      roasting: ['A blink too slow that time.', 'The green came and went without you.']
    },
    stroop: {
      cheering: ['Your brain ignored the word. Nice.', 'Ink over word — you read it right.'],
      roasting: ['The word tricked you that time.', 'Your eyes read the word, not the ink.']
    },
    schulte: {
      cheering: ['One, two, three — all the way home.', 'A tidy little counting run.'],
      roasting: ['The numbers scattered and you lost one.', 'One wrong step and the chain broke.']
    },
    flash: {
      cheering: ['Your eyes counted faster than the flash.', 'More dots, spotted instantly.'],
      roasting: ['The dots blurred together that time.', 'You picked the quieter side.']
    },
    spotnew: {
      cheering: ['The new one could not hide from you.', 'A sharp memory for faces — er, shapes.'],
      roasting: ['That one you had seen before, actually.', 'The new shape slipped past.']
    },
    nback: {
      cheering: ['Every judgment right. A clean run of memory.', 'N-back, no slip-ups. Impressive.'],
      roasting: ['One judgment drifted and the chain broke.', 'So close — one match slipped away.']
    },
    value: {
      cheering: ['The bigger number never stood a chance.', 'Quick maths, quicker finger.'],
      roasting: ['The smaller sum fooled you that time.', 'Nearly — the other side was bigger.']
    },
    flex: {
      cheering: ['You switched rules without blinking.', 'Flexible thinking, right on cue.'],
      roasting: ['The rule changed and you kept the old one.', 'Right trait, wrong pick — nearly.']
    },
    vismem: {
      cheering: ['You kept the whole picture in mind.', 'One changed shape, caught red-handed.'],
      roasting: ['The changed shape hid in plain sight.', 'Your memory blinked for a second.']
    },
    quicksum: {
      cheering: ['Added up like a quiet calculator.', 'Every number counted, none lost.'],
      roasting: ['The total drifted by a little.', 'One number slipped out of the sum.']
    },
    bubble: {
      cheering: ['Two bubbles, one perfect total.', 'You found the only pair that fits.'],
      roasting: ['Those two add up to almost — not quite.', 'A tempting pair, but the wrong total.']
    },
    trio: {
      cheering: ['A real set, found fair and square.', 'Three cards, one clean pattern.'],
      roasting: ['Nearly a set — one trait spoiled it.', 'The cards conspired against that pick.']
    },
    pattern: {
      cheering: ['You saw the rule before the grid did.', 'Pattern cracked. The row is complete.'],
      roasting: ['The rule was hiding one step further.', 'That piece almost fit — almost.']
    },
    orbit: {
      cheering: ['Two balls, tracked through the whole dance.', 'Your eyes never lost them.'],
      roasting: ['The balls swapped places on you.', 'One of them escaped your watch.']
    },
    digitmem: {
      cheering: ['Every digit, in order. Beautiful recall.', 'The numbers stayed put in your head.'],
      roasting: ['One digit wandered off in the recall.', 'So close — the order tripped you up.']
    }
  };

  function pickLine(pool, lastLine) {
    if (!pool || !pool.length) return { line: '', lastLine: null };
    var line = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) {
      var guard = 0;
      while (line === lastLine && guard++ < 10) {
        line = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    return { line: line, lastLine: line };
  }

  // Pick a line for a challenge + kind ('cheering' | 'roasting' | 'noob'),
  // preferring the game's own pool, falling back to the global pool.
  function pickLineFor(challenge, kind, lastLine) {
    var pool = (BY_GAME[challenge] && BY_GAME[challenge][kind]) || REACTION_LINES[kind];
    return pickLine(pool, lastLine);
  }

  var api = { REACTION_LINES: REACTION_LINES, BY_GAME: BY_GAME, pickLine: pickLine, pickLineFor: pickLineFor };
  if (typeof window !== 'undefined') {
    window.REACTION_LINES = REACTION_LINES;
    window.BY_GAME = BY_GAME;
    window.pickLine = pickLine;
    window.pickLineFor = pickLineFor;
  }
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
