// Reflex Test — the three challenges (PRD §3).
// Pure logic lives in testable functions; the render* functions build the
// play area for one round and report ONE verdict: correct or wrong.
// Latency rules (PRD §6): every gameplay input is pointerdown, never click.
// Reaction timing reads event.timeStamp against the requestAnimationFrame
// timestamp of the frame that painted the stimulus — both share the
// performance.now() clock. Never measure inside a setTimeout callback.
(function (global) {
  'use strict';

  var TOTAL_ROUNDS = 10;

  // ---- timing constants (PRD §3) — one setting each, tune after play-testing
  var COLOR_CUTOFF_MS = 600;      // click within this of the change = correct
  var COLOR_WAIT_MIN_MS = 1500;   // colour changes after a random 1.5–5 s
  var COLOR_WAIT_MAX_MS = 5000;
  var COLOR_NOCLICK_MS = 2000;    // no click within 2 s of the change = wrong
  var ODD_ROUND_MS = 5000;        // 5 s per Odd One Out round
  var MEMORY_ANSWER_MS = 10000;   // 10 s to click the sequence back

  // Test hook: window.__RT_FAST__ makes every delay tiny so a harness can
  // play full sessions in milliseconds. Production never sets it.
  // T(ms, fastMs): fastMs overrides when set, else ms/100 (min 1).
  function T(ms, fastMs) {
    if (typeof window !== 'undefined' && window.__RT_FAST__) {
      if (fastMs !== undefined) return fastMs;
      return Math.max(1, Math.round(ms / 100));
    }
    return ms;
  }
  function rtSetTimeout(fn, ms, fastMs) { return setTimeout(fn, T(ms, fastMs)); }

  // Deterministic RNG for tests (mulberry32).
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ================= A. MEMORY BLOCKS =================
  // 3x3 grid. Blocks light up one at a time (~600 ms each; clicks ignored
  // during playback). Player clicks them back in the same order within 10 s.
  // First wrong click, or time running out, ends the round as wrong.
  function memorySeqLen(round) {
    if (round <= 3) return 3;
    if (round <= 6) return 4;
    if (round <= 8) return 5;
    return 6;
  }
  function memoryLightMs(round) { return round >= 9 ? 450 : 600; } // rounds 9-10 lit faster
  function memoryGapMs(round) { return round >= 9 ? 90 : 120; }

  // Sequence of distinct cells (0..8), length = memorySeqLen(round).
  function makeMemorySequence(round, rand) {
    rand = rand || Math.random;
    var n = memorySeqLen(round);
    var cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    var seq = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.floor(rand() * cells.length);
      seq.push(cells.splice(idx, 1)[0]);
    }
    return seq;
  }

  // Judge one click-back step: expected = sequence[pos], got = clicked cell.
  function memoryStepOk(sequence, pos, cell) { return sequence[pos] === cell; }

  // ================= B. ODD ONE OUT =================
  // Grid of shapes (circles, squares, triangles), e.g. 4x3. All identical
  // except one, which differs in size, in shape, or in both, in a random
  // position. One click: the odd shape is correct, any other is wrong.
  // 5 s per round. Early rounds: different shape, or much bigger/smaller.
  // Later rounds: same shape, slightly different size — difference shrinks.
  var ODD_COLS = 4, ODD_ROWS = 3;
  var SHAPES = ['circle', 'square', 'triangle'];

  // Fractional size difference for the odd shape, shrinking round by round.
  function oddSizeDiff(round) {
    var diffs = [0.60, 0.55, 0.50, 0.35, 0.30, 0.25, 0.20, 0.17, 0.13, 0.10];
    return diffs[Math.max(1, Math.min(10, round)) - 1];
  }
  // Rounds 1-3 may differ by shape; from round 4 on it is size only.
  function oddMayDifferByShape(round) { return round <= 3; }

  function makeOddSpec(round, rand) {
    rand = rand || Math.random;
    var baseShape = SHAPES[Math.floor(rand() * SHAPES.length)];
    var diffKind = (oddMayDifferByShape(round) && rand() < 0.5) ? 'shape' : 'size';
    var oddShape = baseShape;
    if (diffKind === 'shape') {
      var others = SHAPES.filter(function (s) { return s !== baseShape; });
      oddShape = others[Math.floor(rand() * others.length)];
    }
    var bigger = rand() < 0.5;
    var diff = oddSizeDiff(round);
    var baseSize = 64; // px, base shape size
    var oddSize = diffKind === 'size'
      ? Math.round(baseSize * (bigger ? 1 + diff : 1 - diff))
      : baseSize;
    var total = ODD_COLS * ODD_ROWS;
    return {
      cols: ODD_COLS, rows: ODD_ROWS, total: total,
      baseShape: baseShape, oddShape: oddShape,
      oddIndex: Math.floor(rand() * total),
      baseSize: baseSize, oddSize: oddSize,
      diffKind: diffKind, bigger: bigger, sizeDiff: diff
    };
  }

  // ================= C. COLOR CHANGE TAP =================
  // Large panel on one colour: "Wait for it..." At a random moment the panel
  // changes colour — click as fast as humanly possible. Reaction time is
  // measured in ms and shown every round.
  function colorWaitMs(rand) {
    rand = rand || Math.random;
    return COLOR_WAIT_MIN_MS + rand() * (COLOR_WAIT_MAX_MS - COLOR_WAIT_MIN_MS);
  }
  // ms between the painted colour change and the pointerdown event.
  function reactionMs(eventTs, paintTs) { return Math.round(eventTs - paintTs); }
  // Judge a Color Change Tap round. falseStart = clicked before the change.
  // clicked = false means no click within COLOR_NOCLICK_MS of the change.
  function colorTapJudge(o) {
    if (o.falseStart) return { correct: false, reason: 'false-start' };
    if (!o.clicked) return { correct: false, reason: 'timeout' };
    if (o.reactionMs <= COLOR_CUTOFF_MS) return { correct: true, reason: 'fast', reactionMs: o.reactionMs };
    return { correct: false, reason: 'slow', reactionMs: o.reactionMs };
  }

  // ================= DOM renderers =================
  // Each renderer builds one round inside `el`, drives it, and calls
  // onVerdict(correct, extra) exactly once. Returns { destroy }.
  // `bar` is an optional { set(frac), show(), hide() } timer-bar controller.
  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function clearEl(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ---- Memory Blocks renderer ----
  function renderMemory(container, round, onVerdict, bar) {
    var seq = makeMemorySequence(round);
    // Test hook (fast mode only): expose the sequence so a harness can play
    // the round for real instead of guessing it from the DOM.
    if (typeof window !== 'undefined' && window.__RT_FAST__) window.__RT_MEM_SEQ = seq.slice();
    var lightMs = memoryLightMs(round), gapMs = memoryGapMs(round);
    var grid = el('div', 'memory-grid');
    var blocks = [];
    for (var i = 0; i < 9; i++) {
      var b = el('button', 'mem-block', '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Block ' + (i + 1));
      grid.appendChild(b);
      blocks.push(b);
    }
    clearEl(container);
    container.appendChild(grid);
    var hint = el('p', 'play-hint', 'Watch the blocks light up…');
    container.appendChild(hint);

    var done = false, phase = 'playback', pos = 0, timers = [];
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      if (bar) bar.hide();
      onVerdict(correct, { sequence: seq, seqLen: seq.length });
    }
    function light(i, cls) {
      blocks[i].classList.add(cls || 'lit');
      timers.push(rtSetTimeout(function () { blocks[i].classList.remove(cls || 'lit'); }, lightMs, lightMs >= 450 ? 6 : 6));
    }
    // Playback: light each block in sequence.
    var step = 0;
    function playNext() {
      if (done) return;
      if (step >= seq.length) {
        phase = 'answer';
        hint.textContent = 'Now click them back in the same order — you have 10 seconds!';
        if (bar) { bar.show(); bar.set(1); }
        var t0 = Date.now();
        var tick = setInterval(function () {
          if (done) { clearInterval(tick); return; }
          var left = 1 - (Date.now() - t0) / MEMORY_ANSWER_MS;
          if (bar) bar.set(Math.max(0, left));
          if (left <= 0) { clearInterval(tick); finish(false); }
        }, 100);
        timers.push(tick);
        return;
      }
      light(seq[step], 'lit');
      step++;
      timers.push(rtSetTimeout(playNext, lightMs + gapMs, 12));
    }
    playNext();

    blocks.forEach(function (b, i) {
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (done || phase !== 'answer') return; // clicks ignored during playback
        if (memoryStepOk(seq, pos, i)) {
          b.classList.add('good');
          rtSetTimeout(function () { b.classList.remove('good'); }, 200, 4);
          pos++;
          if (pos >= seq.length) finish(true);
        } else {
          b.classList.add('bad');
          finish(false);
        }
      });
    });
    return { destroy: function () { done = true; timers.forEach(clearTimeout); } };
  }

  // ---- Odd One Out renderer ----
  function renderOdd(container, round, onVerdict, bar) {
    var spec = makeOddSpec(round);
    var grid = el('div', 'odd-grid');
    var cells = [];
    for (var i = 0; i < spec.total; i++) {
      var isOdd = i === spec.oddIndex;
      var shape = isOdd ? spec.oddShape : spec.baseShape;
      var size = isOdd ? spec.oddSize : spec.baseSize;
      var cell = el('button', 'odd-cell', '');
      cell.type = 'button';
      cell.setAttribute('aria-label', 'Shape ' + (i + 1));
      var s = el('span', 'odd-shape shape-' + shape, '');
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      cell.appendChild(s);
      grid.appendChild(cell);
      cells.push(cell);
    }
    clearEl(container);
    container.appendChild(grid);
    container.appendChild(el('p', 'play-hint', 'Click the ODD one out — fast! You have 5 seconds.'));

    var done = false;
    if (bar) { bar.show(); bar.set(1); }
    var t0 = Date.now();
    var tick = setInterval(function () {
      if (done) { clearInterval(tick); return; }
      var left = 1 - (Date.now() - t0) / ODD_ROUND_MS;
      if (bar) bar.set(Math.max(0, left));
      if (left <= 0) { clearInterval(tick); finish(false); }
    }, 100);
    function finish(correct) {
      if (done) return; done = true;
      clearInterval(tick);
      if (bar) bar.hide();
      onVerdict(correct, { spec: spec });
    }
    cells.forEach(function (cell, i) {
      cell.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (done) return;
        finish(i === spec.oddIndex);
      });
    });
    return { destroy: function () { done = true; clearInterval(tick); } };
  }

  // ---- Color Change Tap renderer ----
  function renderColor(container, round, onVerdict, bar) {
    var panel = el('div', 'color-panel wait', '');
    panel.setAttribute('role', 'button');
    panel.setAttribute('aria-label', 'Tap when the colour changes');
    var label = el('div', 'color-label', 'WAIT FOR IT…');
    var msLine = el('div', 'color-ms', '');
    panel.appendChild(label);
    panel.appendChild(msLine);
    clearEl(container);
    container.appendChild(panel);
    container.appendChild(el('p', 'play-hint', 'Click the panel the INSTANT it turns green. Click early and it is a false start!'));

    var done = false, changed = false, paintTs = null, waitTimer = null, noClickTimer = null;
    function finish(judgement) {
      if (done) return; done = true;
      if (waitTimer) clearTimeout(waitTimer);
      if (noClickTimer) clearTimeout(noClickTimer);
      if (bar) bar.hide();
      onVerdict(judgement.correct, { reason: judgement.reason, reactionMs: judgement.reactionMs });
    }
    function onTap(ev) {
      if (done) return;
      if (!changed) {
        // False start: clicked before the colour changed.
        panel.classList.add('false-start');
        label.textContent = 'FALSE START!';
        finish({ correct: false, reason: 'false-start' });
        return;
      }
      var ms = reactionMs(ev.timeStamp, paintTs);
      msLine.textContent = ms + ' ms';
      if (ms <= COLOR_CUTOFF_MS) {
        label.textContent = ms + ' ms — FAST!';
        panel.classList.add('fast');
      } else {
        label.textContent = ms + ' ms — too slow.';
        panel.classList.add('slow');
      }
      finish(colorTapJudge({ clicked: true, reactionMs: ms }));
    }
    panel.addEventListener('pointerdown', onTap);

    // Schedule the colour change. The measurement starts at the rAF
    // timestamp of the frame that paints the new colour — not at the
    // setTimeout callback (PRD §6).
    waitTimer = rtSetTimeout(function () {
      if (done) return;
      requestAnimationFrame(function (frameTs) {
        if (done) return;
        changed = true;
        paintTs = frameTs;
        panel.classList.remove('wait');
        panel.classList.add('go');
        label.textContent = 'TAP NOW!';
        // No click within 2 s of the change = wrong.
        noClickTimer = rtSetTimeout(function () {
          if (!done) { label.textContent = 'No click in 2 seconds!'; finish({ correct: false, reason: 'timeout' }); }
        }, COLOR_NOCLICK_MS, 1500);
      });
    }, colorWaitMs(), 40);
    return { destroy: function () { done = true; if (waitTimer) clearTimeout(waitTimer); if (noClickTimer) clearTimeout(noClickTimer); } };
  }

  var api = {
    TOTAL_ROUNDS: TOTAL_ROUNDS,
    COLOR_CUTOFF_MS: COLOR_CUTOFF_MS,
    COLOR_WAIT_MIN_MS: COLOR_WAIT_MIN_MS,
    COLOR_WAIT_MAX_MS: COLOR_WAIT_MAX_MS,
    COLOR_NOCLICK_MS: COLOR_NOCLICK_MS,
    ODD_ROUND_MS: ODD_ROUND_MS,
    MEMORY_ANSWER_MS: MEMORY_ANSWER_MS,
    T: T,
    mulberry32: mulberry32,
    memorySeqLen: memorySeqLen,
    memoryLightMs: memoryLightMs,
    memoryGapMs: memoryGapMs,
    makeMemorySequence: makeMemorySequence,
    memoryStepOk: memoryStepOk,
    oddSizeDiff: oddSizeDiff,
    oddMayDifferByShape: oddMayDifferByShape,
    makeOddSpec: makeOddSpec,
    colorWaitMs: colorWaitMs,
    reactionMs: reactionMs,
    colorTapJudge: colorTapJudge,
    renderMemory: renderMemory,
    renderOdd: renderOdd,
    renderColor: renderColor
  };
  if (typeof window !== 'undefined') window.ReflexChallenges = api;
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
