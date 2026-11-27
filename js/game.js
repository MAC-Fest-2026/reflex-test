// Reflex Test — session flow, scoring, NOOB rule, reaction overlay (PRD §2, §4, §5).
// Scoring must never drift from Math Roast: correct +2, wrong/timeout/
// false start -1, max 20, floor 0. NOOB rule: at exactly 0, a wrong round
// keeps the score at 0 and fires the NOOB meme + voice instead of a roast.
// NO text-to-speech anywhere — a meme with no paired audio plays SILENT.
(function (global) {
  'use strict';

  var TOTAL_ROUNDS = 10;
  var REACTION_MS = 2400; // reaction overlay display, ~2-3 s (PRD §2)
  var AUDIO_CAP_MS = 2600; // paired mp3s cut at ~2.6 s so the session stays rapid

  var CHALLENGE_NAMES = {
    memory: 'Memory Blocks',
    odd: 'Odd One Out',
    color: 'Color Change Tap'
  };
  var CHALLENGE_DESCS = {
    memory: 'Watch the blocks light up, then click them back in the same order.',
    odd: 'Spot the one shape that is different — size or shape. Click it, fast.',
    color: 'Wait for the panel to turn green, then tap it. Fastest finger wins.'
  };

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
    if (score >= 15) return 'Sharp. The memes barely got you.';
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

  // ---- meme element + audio (PRD §5) ----
  function memeEl(meme) {
    if (!meme) return null;
    var file = meme.file;
    if (/\.(mp4|webm)$/i.test(file)) {
      var v = document.createElement('video');
      v.src = file; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
      return v;
    }
    var img = document.createElement('img');
    img.src = file; img.alt = 'Reaction meme';
    return img;
  }
  // Preload a few memes in the background — ONLY on the select screen and
  // during reaction overlays, NEVER during a live round (PRD §6).
  var preloadBin = null;
  function preloadMeme(meme) {
    if (!meme) return;
    if (!preloadBin) { preloadBin = document.createElement('div'); preloadBin.id = 'preload-bin'; preloadBin.style.display = 'none'; document.body.appendChild(preloadBin); }
    if (preloadBin.childNodes.length > 14) return; // cap: never hoard media
    var node = memeEl(meme);
    if (!node) return;
    if (node.tagName === 'VIDEO') { try { node.preload = 'auto'; node.load(); } catch (e) {} }
    preloadBin.appendChild(node);
    setTimeout(function () { try { if (node.parentNode) node.parentNode.removeChild(node); } catch (e) {} }, 30000);
  }
  function preloadSome() {
    if (typeof MEMES === 'undefined') return;
    var i, picks = [];
    for (i = 0; i < 3; i++) picks.push(pickMeme(MEMES.cheering, null).meme);
    for (i = 0; i < 3; i++) picks.push(pickMeme(MEMES.roasting, null).meme);
    for (i = 0; i < 2; i++) picks.push(pickMeme(MEMES.noob, null).meme);
    picks.forEach(preloadMeme);
  }

  // ---- state ----
  var state = null; // { challenge, round, score, times, lastCheer, lastRoast, lastNoob, soundOn, controller, reactionTimer }
  var currentAudio = null;

  function $(id) { return document.getElementById(id); }
  function T(ms, fastMs) { return window.ReflexChallenges.T(ms, fastMs); }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    $(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function stopCurrentAudio() {
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
  }
  function tryPlayFile(path, capMs) {
    return new Promise(function (resolve) {
      if (!state || !state.soundOn) return resolve(false);
      try {
        var a = new Audio(path);
        var done = false;
        var finish = function (ok) { if (!done) { done = true; resolve(ok); } };
        a.addEventListener('error', function () { finish(false); });
        a.addEventListener('canplay', function () {
          var p = a.play();
          if (p && p.then) p.then(function () { finish(true); }, function () { finish(false); });
          else finish(true);
        });
        a.load();
        currentAudio = a;
        if (capMs) setTimeout(function () { try { a.pause(); } catch (e) {} if (currentAudio === a) currentAudio = null; }, capMs);
      } catch (e) { resolve(false); }
    });
  }
  // Play ONLY this meme's paired mp3. audio: null -> SILENT. No TTS, ever.
  function playMemeAudio(meme) {
    if (!meme || !meme.audio) return;
    tryPlayFile(meme.audio, AUDIO_CAP_MS);
  }

  // ---- floating meme faces (chaos layer, behind the card, never clickable) ----
  function spawnFloaters() {
    var layer = $('float-layer');
    if (!layer || layer.childNodes.length) return;
    var files = ['memes/cheering/cheer-03.mp4', 'memes/cheering/cheer-11.mp4', 'memes/roasting/roast-05.mp4', 'memes/roasting/roast-20.mp4', 'memes/cheering/cheer-32.mp4', 'memes/roasting/roast-41.mp4'];
    files.forEach(function (f, i) {
      var v = document.createElement('video');
      v.src = f; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
      v.className = 'float-meme';
      var size = 70 + Math.floor(Math.random() * 60);
      v.style.width = size + 'px';
      v.style.height = size + 'px';
      v.style.top = (8 + Math.random() * 70) + 'vh';
      v.style.animationDuration = (14 + Math.random() * 14) + 's,' + (2 + Math.random() * 2) + 's';
      v.style.animationDelay = (-Math.random() * 20) + 's, 0s';
      layer.appendChild(v);
    });
  }
  function flashBody(kind) {
    document.body.classList.remove('flash-cheer', 'flash-roast');
    void document.body.offsetWidth;
    document.body.classList.add(kind === 'cheer' ? 'flash-cheer' : 'flash-roast');
    setTimeout(function () { document.body.classList.remove('flash-cheer', 'flash-roast'); }, 800);
  }
  function spawnJumpPop() {
    var layer = $('float-layer');
    if (!layer) return;
    var v = document.createElement('video');
    v.src = 'memes/cheering/cheer-15.mp4'; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    v.className = 'jump-pop';
    v.style.width = '180px'; v.style.height = '180px';
    v.style.left = (15 + Math.random() * 60) + 'vw';
    v.style.top = (15 + Math.random() * 50) + 'vh';
    layer.appendChild(v);
    setTimeout(function () { try { v.remove(); } catch (e) {} }, 850);
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

  // ---- session flow ----
  function updateBestLines() {
    ['memory', 'odd', 'color'].forEach(function (ch) {
      var b = bestScore(ch);
      var elx = $('best-' + ch);
      if (!elx) return;
      var t = b == null ? 'Best today: —' : 'Best today: ' + b + ' / 20';
      if (ch === 'color') {
        var bm = bestColorMs(), ba = bestColorAvgMs();
        if (bm != null) t += ' · fastest tap ' + bm + ' ms';
        if (ba != null) t += ' · best avg ' + ba + ' ms';
      }
      elx.textContent = t;
    });
  }

  function startSession(challenge) {
    stopCurrentAudio();
    state = {
      challenge: challenge, round: 1, score: 0, correctCount: 0, times: [],
      lastCheer: null, lastRoast: null, lastNoob: null,
      soundOn: state ? state.soundOn : true,
      controller: null, reactionTimer: null
    };
    // Sound unlock: this click IS the user gesture — start preloading now.
    preloadSome();
    $('challenge-name').textContent = CHALLENGE_NAMES[challenge];
    showScreen('game-screen');
    startRound();
  }

  function startRound() {
    var bar = makeBar();
    bar.hide();
    $('q-count').textContent = 'Round ' + state.round + ' / ' + TOTAL_ROUNDS;
    $('score-now').textContent = 'Score: ' + state.score;
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
    var C = window.ReflexChallenges;
    if (state.challenge === 'memory') state.controller = C.renderMemory(area, state.round, onVerdict, bar);
    else if (state.challenge === 'odd') state.controller = C.renderOdd(area, state.round, onVerdict, bar);
    else state.controller = C.renderColor(area, state.round, onVerdict, bar);
  }

  function onVerdict(correct, extra) {
    if (!state) return;
    extra = extra || {};
    if (correct) state.correctCount++;
    if (state.challenge === 'color' && extra.reactionMs != null) state.times.push(extra.reactionMs);
    var res = applyAnswer(state.score, correct);
    state.score = res.score;
    var kind = res.kind;

    // Pick the meme: ONLY the meme choice is random, the sound is its pair.
    var meme;
    if (kind === 'cheer') { var p1 = pickMeme(MEMES.cheering, state.lastCheer); meme = p1.meme; state.lastCheer = p1.lastFile; }
    else if (kind === 'noob') { var p2 = pickMeme(MEMES.noob, state.lastNoob); meme = p2.meme; state.lastNoob = p2.lastFile; }
    else { var p3 = pickMeme(MEMES.roasting, state.lastRoast); meme = p3.meme; state.lastRoast = p3.lastFile; }

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

    flashBody(kind);
    if (kind === 'cheer') spawnJumpPop();
    else { document.body.classList.add('shake'); setTimeout(function () { document.body.classList.remove('shake'); }, 500); }

    $('reaction-kind').textContent = kind === 'cheer' ? 'CORRECT!' : kind === 'noob' ? 'NOOB!' : 'ROASTED!';
    $('reaction-kind').className = kind;
    var mm = $('reaction-meme'); mm.innerHTML = '';
    if (meme) mm.appendChild(memeEl(meme));
    $('reaction-line').textContent = meme ? meme.voice : '';
    $('reaction-answer').textContent = answer;
    var r = $('reaction');
    r.classList.remove('hidden');
    r.classList.add('surprise');
    playMemeAudio(meme);
    // Preload the NEXT reactions now — the round is over, the main thread
    // is free, and the next reaction will already be loaded.
    preloadSome();

    state.reactionTimer = setTimeout(function () {
      stopCurrentAudio();
      r.classList.add('hidden');
      r.classList.remove('surprise');
      state.round++;
      if (state.round <= TOTAL_ROUNDS) startRound();
      else finishSession();
    }, T(REACTION_MS));
  }

  function finishSession() {
    var ch = state.challenge;
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
    var rm = $('result-meme'); rm.innerHTML = '';
    var finalMeme = state.score >= 10 ? pickMeme(MEMES.cheering, null).meme
      : state.score === 0 ? pickMeme(MEMES.noob, null).meme
      : pickMeme(MEMES.roasting, null).meme;
    if (finalMeme) rm.appendChild(memeEl(finalMeme));
    var cm = $('cert-meme'); cm.innerHTML = '';
    if (finalMeme) cm.appendChild(memeEl(finalMeme));
    updateBestLines();
    showScreen('result-screen');
  }

  // ---- wiring ----
  function init() {
    spawnFloaters();
    updateBestLines();
    document.querySelectorAll('.challenge-card').forEach(function (card) {
      card.addEventListener('click', function () { startSession(card.dataset.challenge); });
    });
    $('play-again-btn').addEventListener('click', function () { if (state) startSession(state.challenge); });
    $('change-challenge-btn').addEventListener('click', function () { updateBestLines(); showScreen('start-screen'); });
    $('home-btn').addEventListener('click', function () { updateBestLines(); showScreen('start-screen'); });
    $('sound-toggle').addEventListener('click', function () {
      if (!state) state = { soundOn: true };
      state.soundOn = !state.soundOn;
      if (!state.soundOn) stopCurrentAudio();
      $('sound-toggle').textContent = 'SOUND: ' + (state.soundOn ? 'ON' : 'OFF');
    });
    $('fs-toggle').addEventListener('click', function () {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      } catch (e) {}
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
    applyAnswer: applyAnswer,
    verdictFor: verdictFor,
    certificateFor: certificateFor,
    bestScore: bestScore,
    saveBest: saveBest,
    bestColorMs: bestColorMs,
    bestColorAvgMs: bestColorAvgMs,
    saveColorTimes: saveColorTimes,
    CHALLENGE_NAMES: CHALLENGE_NAMES,
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
