// Reflex Test — session flow, scoring, NOOB rule, reaction overlay (PRD §2, §4).
// Scoring must never drift from Math Roast: correct +2, wrong/timeout/
// false start -1, max 20, floor 0. NOOB rule: at exactly 0, a wrong round
// keeps the score at 0 and fires the NOOB meme instead of a roast.
// The UI is freaky Math Roast style now: lobby start, colour flashes,
// screen shake, MLG flying layer. Reactions are video memes + their ONE
// paired mp3 (see js/memes.js), never a random sound.
// 17 challenges: pick one per session, 10 rounds of that style.
(function (global) {
  'use strict';

  var TOTAL_ROUNDS = 10;
  var REACTION_MS = 2400; // reaction overlay display, ~2-3 s (PRD §2)

  // ---- the 17 challenges: name, card line, pastel accent, mini preview,
  // and the instruction screen copy (what to do, correct, wrong, time, scoring).
  var CHALLENGES = [
    { id: 'memory', name: 'Memory Blocks', desc: 'Watch the blocks light up, then click them back in the same order.', accent: 'acc-sage',
      preview: '<span class="pv"><span class="pv-cell"></span><span class="pv-cell"></span><span class="pv-cell"></span><span class="pv-cell"></span><span class="pv-cell lit"></span><span class="pv-cell"></span><span class="pv-cell"></span><span class="pv-cell"></span><span class="pv-cell"></span></span>',
      howto: ['Watch the blocks light up, then tap them back in the same order.', 'Correct: the whole sequence right. Wrong: one wrong tap, or time runs out.', '10 seconds to answer. +2 correct, −1 wrong.'] },
    { id: 'odd', name: 'Odd One Out', desc: 'Spot the one shape that is different — size or shape. Click it, fast.', accent: 'acc-blue',
      preview: '<span class="pv"><span class="pv-dot"></span><span class="pv-square"></span><span class="pv-dot big"></span><span class="pv-dot"></span></span>',
      howto: ['One shape is different — in size or shape. Tap it.', 'Correct: you tap the odd one. Wrong: any other shape, or no tap.', '5 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'color', name: 'Color Change Tap', desc: 'Wait for the panel to turn green, then tap it. Fastest finger wins.', accent: 'acc-terra',
      preview: '<span class="pv"><span class="pv-panel" style="background:#8aa3b8"></span><span class="pv-arrow">→</span><span class="pv-panel" style="background:#8fa98f"></span></span>',
      howto: ['Wait for the panel to turn green, then tap it as fast as you can.', 'Correct: tap within 600 ms of the change. Wrong: too slow, no tap in 2 s, or a false start.', 'Your time in ms shows every round. +2 correct, −1 wrong.'] },
    { id: 'stroop', name: 'Color Confusion', desc: 'A colour word in the wrong ink. Tap the INK colour.', accent: 'acc-rose',
      preview: '<span class="pv"><span class="pv-word" style="color:#c96f5a">BLUE</span></span>',
      howto: ['A colour word appears, printed in an ink colour. Tap the button for the INK colour — not the word.', 'Correct: the ink colour. Wrong: the word’s colour, or time runs out.', '3 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'schulte', name: 'Schulte Table', desc: 'Tap the numbers in order, 1 → 2 → 3, all the way up.', accent: 'acc-gold',
      preview: '<span class="pv pv-nums"><span>7</span><span>2</span><span>9</span><span>4</span><span>1</span><span>6</span><span>8</span><span>3</span><span>5</span></span>',
      howto: ['Tap the numbers in order, 1 → 2 → 3, all the way up.', 'Correct: the whole sequence. Wrong: one wrong tap, or time runs out.', 'Up to 20 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'flash', name: 'Flash Crowd', desc: 'Two flashes of dots. Which side had more?', accent: 'acc-lilac',
      preview: '<span class="pv"><span class="pv-dots">• • • •</span><span class="pv-vs">vs</span><span class="pv-dots">• • • • • • • •</span></span>',
      howto: ['Two panels flash dots for a second. Tap the side that had MORE dots.', 'Correct: the side with more. Wrong: the other side, or no tap.', '5 seconds to answer. +2 correct, −1 wrong.'] },
    { id: 'spotnew', name: 'Spot the New', desc: 'Remember the shapes. Tap the one you never saw.', accent: 'acc-mint',
      preview: '<span class="pv"><span class="pv-dot"></span><span class="pv-square"></span><span class="pv-tri"></span><span class="pv-num">?</span></span>',
      howto: ['Shapes appear one at a time — remember them. Then tap the one shape you did NOT see.', 'Correct: the new shape. Wrong: a shape you saw, or no tap.', '5 seconds to answer. +2 correct, −1 wrong.'] },
    { id: 'nback', name: 'N-Back', desc: 'Same as N steps back? MATCH or NO MATCH, every shape.', accent: 'acc-sage',
      preview: '<span class="pv"><span class="pv-dot" style="background:#c96f5a"></span><span class="pv-dot" style="background:#8aa3b8"></span><span class="pv-num">= ?</span></span>',
      howto: ['Shapes appear one at a time. For each one, tap MATCH if it is the same as the one N steps back, else NO MATCH.', 'Correct: every judgment right. One mistake and the round is wrong.', 'No rush — take each shape as it comes. +2 correct, −1 wrong.'] },
    { id: 'value', name: 'Value Comparison', desc: 'Two sums. Tap the bigger value.', accent: 'acc-blue',
      preview: '<span class="pv"><span class="pv-num">8 × 3</span><span class="pv-vs">vs</span><span class="pv-num">5 × 5</span></span>',
      howto: ['Two sums appear. Tap the one with the higher value.', 'Correct: the bigger value. Wrong: the smaller one, or no tap.', '5 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'flex', name: 'Mental Flex', desc: 'Two items share a trait. Match the target on it.', accent: 'acc-terra',
      preview: '<span class="pv"><span class="pv-chip" style="background:#c96f5a;border-radius:50%"></span><span class="pv-chip" style="background:#c96f5a;border-radius:5px"></span></span>',
      howto: ['Two items share one trait — that is the rule. Tap the option that matches the target on that same trait.', 'Correct: the right trait. Wrong: any other option, or no tap.', '5 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'vismem', name: 'Visual Memory', desc: 'Look, hide, one shape changes. Tap it.', accent: 'acc-gold',
      preview: '<span class="pv"><span class="pv-dot"></span><span class="pv-dot"></span><span class="pv-dot"></span><span class="pv-ring"></span></span>',
      howto: ['Look at the shapes, then they hide. One shape changes — tap the changed one.', 'Correct: the changed shape. Wrong: any other, or no tap.', '5 seconds to answer. +2 correct, −1 wrong.'] },
    { id: 'quicksum', name: 'Quick Sum', desc: 'Numbers flash by. Add them up on the keypad.', accent: 'acc-rose',
      preview: '<span class="pv"><span class="pv-num">4 + 7 + 2 = ?</span></span>',
      howto: ['Numbers flash one at a time. Add them up, then type the total on the keypad.', 'Correct: the exact total. Wrong: any other total, or time runs out.', '10 seconds to type. +2 correct, −1 wrong.'] },
    { id: 'bubble', name: 'Bubble Sum', desc: 'Two bubbles add to the target. Find the pair.', accent: 'acc-lilac',
      preview: '<span class="pv"><span class="pv-chip">3</span><span class="pv-chip">7</span><span class="pv-chip">2</span><span class="pv-chip">9</span></span>',
      howto: ['A target total is shown. Tap the TWO bubbles that add up to it — only one pair works.', 'Correct: the pair that adds to the target. Wrong: any other pair, or no tap.', '8 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'trio', name: 'Trio', desc: 'Nine cards. Find three that make a set.', accent: 'acc-mint',
      preview: '<span class="pv"><span class="pv-card">●</span><span class="pv-card">●●</span><span class="pv-card">●●●</span></span>',
      howto: ['Nine cards. Tap THREE that make a set: on every trait (shape, count, fill), all three the same or all three different.', 'Correct: a real set. Wrong: any other three, or no tap.', '15 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'pattern', name: 'Pattern Sequence', desc: 'Each row follows a rule. Complete the last one.', accent: 'acc-sage',
      preview: '<span class="pv pv-nums"><span>●</span><span>●●</span><span>●●●</span><span>■</span><span>■■</span><span>■■■</span><span>▲</span><span>▲▲</span><span>?</span></span>',
      howto: ['Each row follows a rule. Tap the piece that completes the last row.', 'Correct: the piece that fits the rule. Wrong: any other, or no tap.', '10 seconds a round. +2 correct, −1 wrong.'] },
    { id: 'orbit', name: 'Orbit Tracker', desc: 'Two balls light up, then they all move. Find them.', accent: 'acc-blue',
      preview: '<span class="pv"><span class="pv-ball"></span><span class="pv-ball hot"></span><span class="pv-ball"></span><span class="pv-ball hot"></span><span class="pv-ball"></span></span>',
      howto: ['Two balls light up — remember them. They all start moving. Tap the two you saw lit.', 'Correct: both original balls. Wrong: any other ball.', '3–4 seconds of movement. +2 correct, −1 wrong.'] },
    { id: 'digitmem', name: 'Digit Memory', desc: 'Remember digits, answer a sum, recall the digits.', accent: 'acc-terra',
      preview: '<span class="pv"><span class="pv-num">7&nbsp;&nbsp;3&nbsp;&nbsp;9&nbsp;&nbsp;1&nbsp;&nbsp;5</span></span>',
      howto: ['Digits appear — remember them in order. Answer a quick sum (just a distraction), then type the digits back on the keypad.', 'Correct: every digit right, in order. Wrong: any digit wrong, or time runs out.', '15 seconds to recall. +2 correct, −1 wrong.'] }
  ];
  var CHALLENGE_NAMES = {};
  CHALLENGES.forEach(function (c) { CHALLENGE_NAMES[c.id] = c.name; });
  function challengeMeta(id) {
    for (var i = 0; i < CHALLENGES.length; i++) if (CHALLENGES[i].id === id) return CHALLENGES[i];
    return null;
  }

  // ---- scoring (PRD §4) — pure, tested ----
  // applyAnswer(score, correct) -> { score, kind } where kind is
  // 'cheer' (correct), 'roast' (wrong, score > 0), 'noob' (wrong at 0).
  function applyAnswer(score, correct) {
    if (correct) return { score: Math.min(20, score + 2), kind: 'cheer' };
    if (score === 0) return { score: 0, kind: 'noob' };
    return { score: Math.max(0, score - 1), kind: 'roast' };
  }
  function verdictFor(score) {
    if (score === 20) return 'Perfect. Untouchable.';
    if (score >= 15) return 'Sharp. The rounds barely got you.';
    if (score >= 10) return 'Decent — half hero, half meme material.';
    if (score >= 1) return 'The roast folder did most of the work.';
    return 'Full NOOB run. Respect for finishing.';
  }
  function certificateFor(score) {
    if (score === 20) return 'Certified Lightning Hands';
    if (score >= 15) return 'Certified Sharp Reflexes';
    if (score >= 10) return 'Certified Decent Reflexes';
    if (score >= 1) return 'Certified Almost-A-Reflex';
    return 'Certified NOOB Hands';
  }

  // ---- storage (PRD §7): best score per challenge on this laptop ----
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function bestKey(ch) { return 'reflex-best-' + ch; }
  function bestScore(ch) { return store.get(bestKey(ch), null); }
  function saveBest(ch, score) {
    var b = bestScore(ch);
    if (b == null || score > b) { store.set(bestKey(ch), score); return true; }
    return false;
  }
  function bestColorMs() { return store.get('reflex-color-best-ms', null); }
  function bestColorAvgMs() { return store.get('reflex-color-best-avg-ms', null); }
  function saveColorTimes(times) {
    // times: measured reaction ms of rounds that were actually clicked.
    if (!times.length) return;
    var best = Math.min.apply(null, times);
    var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
    var pb = bestColorMs();
    if (pb == null || best < pb) store.set('reflex-color-best-ms', best);
    var pa = bestColorAvgMs();
    if (pa == null || avg < pa) store.set('reflex-color-best-avg-ms', avg);
  }

  // ---- state ----
  var state = null; // { challenge, round, score, times, lastCheer, lastRoast, lastNoob, lastKind, controller, reactionTimer }
  var howtoMode = null; // 'start' | 'resume'
  var pendingChallenge = null;

  function $(id) { return document.getElementById(id); }
  function T(ms, fastMs) { return window.ReflexChallenges.T(ms, fastMs); }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    $(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  // ---- timer bar controller ----
  function makeBar() {
    var wrap = $('timer-wrap'), bar = $('timer-bar'), text = $('timer-text');
    return {
      show: function () { wrap.style.display = 'block'; },
      hide: function () { wrap.style.display = 'none'; },
      set: function (frac) {
        bar.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%';
        text.textContent = '';
      }
    };
  }

  // ---- start screen: one card per challenge, built from the meta ----
  function renderCards() {
    var wrap = $('challenge-cards');
    wrap.innerHTML = '';
    CHALLENGES.forEach(function (c) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'challenge-card ' + c.accent;
      card.setAttribute('data-challenge', c.id);
      var pv = document.createElement('span');
      pv.className = 'challenge-preview';
      pv.innerHTML = c.preview;
      var desc = document.createElement('span');
      desc.className = 'challenge-desc';
      desc.textContent = c.desc;
      var best = document.createElement('span');
      best.className = 'challenge-best';
      best.id = 'best-' + c.id;
      best.textContent = 'Best today: —';
      var foot = document.createElement('span');
      foot.className = 'challenge-foot';
      foot.textContent = c.name.toUpperCase();
      card.appendChild(pv);
      card.appendChild(desc);
      card.appendChild(best);
      card.appendChild(foot);
      card.addEventListener('click', function () { showHowto(c.id, 'start'); });
      wrap.appendChild(card);
    });
  }

  // ---- instruction narration (robot voice) ----
  // The user chose SpeechSynthesis for the instruction screens ONLY: when
  // a game's instruction page opens, its 3 instruction lines are read
  // aloud. No TTS in reactions or gameplay — reactions use real meme
  // sounds only. Guarded + silent failure if speech is unavailable.
  function speakHowto(howtoLines) {
    try {
      if (typeof window === 'undefined' || typeof speechSynthesis === 'undefined') return;
      if (typeof SpeechSynthesisUtterance === 'undefined') return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(howtoLines.join('. '));
      u.rate = 1;
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable: fail silently */ }
  }
  function cancelSpeech() {
    try {
      if (typeof window !== 'undefined' && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch (e) { /* ignore */ }
  }
  // Stop any freaky-feel audio (reaction sound, completion music) when the
  // player leaves the screen it belongs to.
  function stopFeelAudio() {
    try {
      if (typeof window !== 'undefined' && window.ReflexFeel) window.ReflexFeel.stopCurrentAudio();
    } catch (e) { /* ignore */ }
  }

  // ---- instruction screen: one per game, before round 1 — and re-openable
  // mid-game from the "How to play" link (the session pauses; resuming
  // restarts the current round, score unchanged).
  function showHowto(challenge, mode) {
    var meta = challengeMeta(challenge);
    if (!meta) return;
    howtoMode = mode;
    pendingChallenge = challenge;
    $('howto-title').textContent = meta.name;
    var hint = $('howto-hint');
    hint.innerHTML = meta.preview;
    var lines = $('howto-lines');
    lines.innerHTML = '';
    meta.howto.forEach(function (line) {
      var p = document.createElement('p');
      p.className = 'howto-line';
      p.textContent = line;
      lines.appendChild(p);
    });
    $('howto-start-btn').textContent = mode === 'resume' ? 'RESUME ROUND' : 'START';
    $('howto-back-btn').style.display = mode === 'resume' ? 'none' : '';
    showScreen('howto-screen');
    // Read the 3 instruction lines aloud (robot voice, instruction screens
    // only) — both on first pick and on mid-game "How to play".
    speakHowto(meta.howto);
  }

  // ---- session flow ----
  function updateBestLines() {
    CHALLENGES.forEach(function (c) {
      var b = bestScore(c.id);
      var elx = $('best-' + c.id);
      if (!elx) return;
      var t = b == null ? 'Best today: —' : 'Best today: ' + b + ' / 20';
      if (c.id === 'color') {
        var bm = bestColorMs(), ba = bestColorAvgMs();
        if (bm != null) t += ' · fastest tap ' + bm + ' ms';
        if (ba != null) t += ' · best avg ' + ba + ' ms';
      }
      elx.textContent = t;
    });
  }

  function startSession(challenge) {
    state = {
      challenge: challenge, round: 1, score: 0, correctCount: 0, times: [],
      lastCheer: null, lastRoast: null, lastNoob: null, lastTimeout: null, lastKind: null,
      controller: null, reactionTimer: null,
      consecLosses: 0, correctStreak: 0, winErrShown: false,
      sessionStart: Date.now(), roundStart: Date.now()
    };
    $('challenge-name').textContent = CHALLENGE_NAMES[challenge];
    showScreen('game-screen');
    startRound();
  }

  function startRound() {
    state.roundStart = Date.now();
    var bar = makeBar();
    bar.hide();
    $('q-count').textContent = 'Round ' + state.round + ' / ' + TOTAL_ROUNDS;
    var scoreEl = $('score-now');
    scoreEl.textContent = 'Score: ' + state.score;
    // Gentle colour shift on the score: sage after a correct round,
    // terracotta after a wrong one. Slow fade only.
    scoreEl.classList.remove('bump-cheer', 'bump-roast');
    if (state.lastKind) {
      scoreEl.classList.add(state.lastKind === 'cheer' ? 'bump-cheer' : 'bump-roast');
      setTimeout(function () { scoreEl.classList.remove('bump-cheer', 'bump-roast'); }, 1200);
    }
    $('best-now').textContent = 'Best: ' + (bestScore(state.challenge) == null ? '—' : bestScore(state.challenge) + ' / 20');
    var dots = $('progress-dots');
    dots.innerHTML = '';
    for (var i = 1; i <= TOTAL_ROUNDS; i++) {
      var d = document.createElement('span');
      d.className = 'dot' + (i < state.round ? ' done' : i === state.round ? ' now' : '');
      dots.appendChild(d);
    }
    var area = $('play-area');
    area.innerHTML = '';
    state.controller = window.ReflexChallenges.render(state.challenge, area, state.round, onVerdict, bar);
  }

  function onVerdict(correct, extra) {
    if (!state) return;
    extra = extra || {};
    var F = (typeof window !== 'undefined') ? window.ReflexFeel : null;
    var M = (typeof window !== 'undefined') ? window.MEMES : null;
    var isTimeout = extra.reason === 'timeout';
    var hadLoss = state.lastKind === 'roast' || state.lastKind === 'noob' || state.lastKind === 'timeout';
    var streakBefore = state.correctStreak;
    var elapsedMs = Date.now() - state.roundStart;
    if (correct) { state.correctCount++; state.correctStreak++; state.consecLosses = 0; }
    else { state.correctStreak = 0; state.consecLosses++; }
    if (state.challenge === 'color' && extra.reactionMs != null) state.times.push(extra.reactionMs);
    var res = applyAnswer(state.score, correct);
    state.score = res.score;
    var kind = isTimeout ? 'timeout' : res.kind;
    state.lastKind = kind;

    // Pick the meme: ONLY the meme choice is random; the sound is the
    // meme's ONE paired mp3 (see js/memes.js). Timeouts get the timeout
    // pool (crying chicken + 6). 3rd consecutive wrong (answered, not a
    // timeout) gets the Windows error screen instead of a roast, once.
    var meme = null, isWinErr = false;
    if (M && F) {
      if (isTimeout) { meme = F.pickMeme(M.timeout, state.lastTimeout); state.lastTimeout = meme; }
      else if (kind === 'cheer') {
        meme = F.pickFromTier(M.cheering, F.cheerTierFor(hadLoss, F.fastAnswer(elapsedMs)), state.lastCheer);
        state.lastCheer = meme;
      }
      else if (kind === 'noob') { meme = F.pickMeme(M.noob, state.lastNoob); state.lastNoob = meme; }
      else if (F.winErrFor(state.consecLosses, state.winErrShown)) {
        isWinErr = true; state.winErrShown = true; meme = M.winError[0];
      }
      else {
        meme = F.pickFromTier(M.roasting, F.roastTierFor(streakBefore, state.consecLosses), state.lastRoast);
        state.lastRoast = meme;
      }
    }
    // The meme's own voice line; the calm text pools in reactions.js are
    // the fallback if a meme ever has no voice.
    var line = meme ? meme.voice : '';
    if (!line) {
      var fb = pickLineFor(state.challenge, kind === 'cheer' ? 'cheering' : kind === 'noob' ? 'noob' : 'roasting', null);
      line = fb.line;
    }

    // Sounds: the meme's paired mp3 only. Timeouts: the chicken gets its
    // escalating cry as its sound; other timeout memes play their own mp3.
    // A wrong answer also grows the chicken cry after the meme's sound.
    if (F) {
      var cryLevel = F.cryLevelFor(state.consecLosses);
      if (isTimeout) {
        if (meme && meme.chicken) F.playChickenCry(cryLevel, 0);
        else if (meme) F.playMemeAudio(meme);
      } else {
        if (meme) F.playMemeAudio(meme);
        if (kind !== 'cheer') F.playChickenCry(cryLevel, 700);
      }
      // Rainbow horse: a correct answer in under 2 seconds. Airhorn when
      // a 3-correct streak is reached.
      if (correct && F.fastAnswer(elapsedMs)) F.flyRainbowHorse(false);
      if (correct && state.correctStreak === 3) F.playAirhorn();
    }

    // Freaky UI triggers (Math Roast style): colour flash on every verdict,
    // screen shake + meme burst + swoopers on a wrong round. VISUAL ONLY —
    // no extra sound is layered here: a reaction plays ONLY its paired mp3
    // (plus the chicken cry on a timeout loss, already handled above). No
    // siren, no record scratch, no surprise sting — layering a second sound
    // over the meme's own sound was a bug in Math Roast (siren heard on
    // right and wrong answers) and is not repeated here.
    if (F) {
      F.flashBody(kind === 'cheer' ? 'cheer' : 'roast');
      if (!correct) {
        F.shakeBody();
        F.memeBurst();
        F.spawnSwooper(); F.spawnSwooper();
      }
    }

    // Answer line: what happened, in plain words.
    var answer = '';
    if (state.challenge === 'color') {
      if (extra.reason === 'false-start') answer = 'False start — you clicked before it turned green!';
      else if (extra.reason === 'timeout') answer = 'No click within 2 seconds of the change.';
      else if (extra.reactionMs != null) answer = 'Reaction time: ' + extra.reactionMs + ' ms' + (correct ? ' — under 600 ms!' : ' — over the 600 ms cutoff.');
    } else if (state.challenge === 'memory' && !correct) {
      answer = 'The sequence was ' + (extra.seqLen || '?') + ' blocks long.';
    } else if (state.challenge === 'odd' && !correct && extra.spec) {
      answer = 'The odd one was the ' + extra.spec.oddShape + ' (' + (extra.spec.diffKind === 'shape' ? 'different shape' : (extra.spec.bigger ? 'bigger' : 'smaller') + ' by ' + Math.round(extra.spec.sizeDiff * 100) + '%') + ').';
    }

    $('reaction-kind').textContent = isWinErr ? 'ERROR!' : kind === 'cheer' ? 'CORRECT!' : kind === 'noob' ? 'NOOB!' : kind === 'timeout' ? "TIME'S UP!" : 'ROASTED!';
    $('reaction-kind').className = isWinErr ? 'winerr' : kind;
    $('reaction-score').textContent = correct ? '+2 points' : kind === 'noob' ? 'stays at 0' : '-1 point';
    $('reaction-line').textContent = line;
    $('reaction-answer').textContent = answer;
    var mm = $('reaction-meme');
    mm.innerHTML = '';
    if (meme && F) { var mel = F.memeEl(meme); if (mel) mm.appendChild(mel); }
    var r = $('reaction');
    r.classList.remove('hidden');
    r.classList.add('surprise');

    state.reactionTimer = setTimeout(function () {
      if (F) F.stopCurrentAudio(); // long clips never play past the reaction overlay
      r.classList.add('hidden');
      r.classList.remove('surprise');
      state.round++;
      if (state.round <= TOTAL_ROUNDS) startRound();
      else finishSession();
    }, T(REACTION_MS));
  }

  function finishSession() {
    var ch = state.challenge;
    var timeSecs = Math.round((Date.now() - state.sessionStart) / 1000);
    var fast = (typeof window !== 'undefined' && window.ReflexFeel) ? window.ReflexFeel.beat60(timeSecs) : false;
    var isNewBest = saveBest(ch, state.score);
    if (ch === 'color') saveColorTimes(state.times);
    var best = null, avg = null;
    if (state.times.length) {
      best = Math.min.apply(null, state.times);
      avg = Math.round(state.times.reduce(function (a, b) { return a + b; }, 0) / state.times.length);
    }
    $('result-title').textContent = state.score === 20 ? 'PERFECT!' : state.score === 0 ? 'FULL NOOB!' : 'DONE!';
    $('result-challenge').textContent = 'Challenge: ' + CHALLENGE_NAMES[ch];
    $('final-score').textContent = state.score;
    $('result-verdict').textContent = verdictFor(state.score);
    $('result-newbest').textContent = isNewBest ? 'NEW BEST for ' + CHALLENGE_NAMES[ch] + ' on this laptop!' : '';
    $('result-stats').textContent = ch === 'color'
      ? (best != null ? 'Fastest tap: ' + best + ' ms · Average: ' + avg + ' ms' : 'No taps landed this session.')
      : 'Correct rounds: ' + state.correctCount + ' of 10.';
    $('cert-title').textContent = certificateFor(state.score);
    $('cert-challenge').textContent = CHALLENGE_NAMES[ch];
    $('cert-score').textContent = state.score + ' / 20';
    $('cert-date').textContent = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    updateBestLines();
    showScreen('result-screen');
    // Finish feel: under 60 seconds -> the rainbow horse flies across (big,
    // with airhorn). Result music by band: 15+ fanfare, 10-14 cheer, 0-9 the
    // FULL pigeon song (2:10) — it plays through until the player leaves.
    if (typeof window !== 'undefined' && window.ReflexFeel) {
      if (fast) window.ReflexFeel.flyRainbowHorse(true);
      window.ReflexFeel.playCompletionMusic(state.score);
    }
  }

  // ---- wiring ----
  function init() {
    renderCards();
    updateBestLines();
    // Ambient MLG layer: floaters, swoopers and jump-pops run from load,
    // behind every screen (lobby, grid, game, result). Pointer-events none.
    if (typeof window !== 'undefined' && window.ReflexFeel) window.ReflexFeel.startFloaters();
    // LOBBY: LET ME IN plays the Among Us start sound and reveals the grid.
    $('let-me-in-btn').addEventListener('click', function () {
      stopFeelAudio();
      if (typeof window !== 'undefined' && window.ReflexFeel) window.ReflexFeel.playAmongUsStart();
      updateBestLines();
      showScreen('start-screen');
    });
    $('play-again-btn').addEventListener('click', function () { stopFeelAudio(); if (state) startSession(state.challenge); });
    $('change-challenge-btn').addEventListener('click', function () { stopFeelAudio(); updateBestLines(); showScreen('start-screen'); });
    $('home-btn').addEventListener('click', function () { stopFeelAudio(); updateBestLines(); showScreen('start-screen'); });
    $('fs-toggle').addEventListener('click', function () {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      } catch (e) {}
    });
    // Instruction screen buttons.
    $('howto-start-btn').addEventListener('click', function () {
      cancelSpeech(); // narration stops the moment START is pressed
      stopFeelAudio();
      if (howtoMode === 'resume') { showScreen('game-screen'); startRound(); }
      else if (pendingChallenge) startSession(pendingChallenge);
    });
    $('howto-back-btn').addEventListener('click', function () { cancelSpeech(); updateBestLines(); showScreen('start-screen'); });
    // Mid-game "How to play": pause the session, re-open the instructions.
    $('howto-link').addEventListener('click', function () {
      if (!state) return;
      stopFeelAudio();
      if (state.controller && state.controller.destroy) state.controller.destroy();
      showHowto(state.challenge, 'resume');
    });
    // Latency self-test (PRD §6).
    $('latency-btn').addEventListener('click', function () { showScreen('latency-screen'); });
    $('latency-back-btn').addEventListener('click', function () { showScreen('start-screen'); });
    $('latency-start-btn').addEventListener('click', function () {
      $('latency-start-btn').disabled = true;
      window.ReflexLatency.runLatencyTest({
        box: $('latency-box'),
        target: $('latency-target'),
        status: $('latency-status'),
        progress: $('latency-progress'),
        result: $('latency-result')
      }, function () { $('latency-start-btn').disabled = false; });
    });
  }

  var api = {
    TOTAL_ROUNDS: TOTAL_ROUNDS,
    REACTION_MS: REACTION_MS,
    CHALLENGES: CHALLENGES,
    CHALLENGE_NAMES: CHALLENGE_NAMES,
    applyAnswer: applyAnswer,
    verdictFor: verdictFor,
    certificateFor: certificateFor,
    bestScore: bestScore,
    saveBest: saveBest,
    bestColorMs: bestColorMs,
    bestColorAvgMs: bestColorAvgMs,
    saveColorTimes: saveColorTimes,
    init: init,
    _state: function () { return state; }
  };
  if (typeof window !== 'undefined') window.ReflexTest = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
