// Reflex Test — challenges 4–17: 14 Braincup-inspired games (Phase 2).
// Original code only — the inspiration is the game ideas and the card-grid
// design language, never Braincup's code. Same Reflex Test rules for every
// game: one challenge per session, exactly 10 rounds, +2 correct / -1 wrong
// or timeout, max 20, floor 0, NOOB text rule at 0, text-only reactions,
// calm lofi UI, mouse-only with pointerdown, on-screen keypad where number
// entry is needed (never keyboard), best score per challenge in localStorage.
//
// Each game has pure, testable logic (make*/judge*) and a DOM renderer
// render*(container, round, onVerdict, bar) -> { destroy }, same contract
// as the original three challenges. Renderers live in the same registry:
// window.ReflexChallenges.render(id, container, round, onVerdict, bar).
(function (global) {
  'use strict';

  var C = global.ReflexChallenges;
  var T = C.T;
  var mulberry32 = C.mulberry32;
  function rtSetTimeout(fn, ms, fastMs) { return setTimeout(fn, T(ms, fastMs)); }

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function clearEl(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ---- shared palette (calm lofi) ----
  var PALETTE = [
    { name: 'Red', hex: '#c96f5a' },
    { name: 'Green', hex: '#7d9b76' },
    { name: 'Blue', hex: '#8aa3b8' },
    { name: 'Yellow', hex: '#d9b36c' },
    { name: 'Purple', hex: '#a58bb0' }
  ];
  var SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'];

  // One shape span. Inline background beats the CSS default colour.
  function shapeEl(shape, colorHex, sizePx) {
    var s = el('span', 'odd-shape shape-' + shape, '');
    s.style.width = sizePx + 'px';
    s.style.height = sizePx + 'px';
    s.style.background = colorHex;
    return s;
  }
  function shapeItemEl(item, sizePx) {
    return shapeEl(item.shape, item.colorHex, sizePx);
  }

  // ---- round timer: shows the bar, ticks it down, calls onTimeout at 0 ----
  function makeTimer(bar, ms, onTimeout) {
    var done = false, tick = null;
    if (bar) { bar.show(); bar.set(1); }
    var t0 = Date.now();
    tick = setInterval(function () {
      if (done) return;
      var left = 1 - (Date.now() - t0) / ms;
      if (bar) bar.set(Math.max(0, left));
      if (left <= 0) { destroy(); onTimeout(); }
    }, 100);
    function destroy() { done = true; if (tick) clearInterval(tick); if (bar) bar.hide(); }
    return { destroy: destroy };
  }

  // ---- on-screen keypad (0-9 + Clear + Enter), pointerdown only ----
  // Returns { el, display } — display is the .key-display element the game
  // updates with the typed text.
  function buildKeypad(onDigit, onEnter, onClear) {
    var pad = el('div', 'keypad');
    var display = el('div', 'key-display', '');
    pad.appendChild(display);
    var grid = el('div', 'key-grid');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'Enter'].forEach(function (k) {
      var b = el('button', 'key-btn' + (k === 'Enter' ? ' key-enter' : ''), k);
      b.type = 'button';
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (k === 'C') onClear();
        else if (k === 'Enter') onEnter();
        else onDigit(k);
      });
      grid.appendChild(b);
    });
    pad.appendChild(grid);
    return { el: pad, display: display };
  }

  // Test hook (fast mode only): expose the round's answer so a harness can
  // play for real instead of guessing it from the DOM.
  function setSolution(sol) {
    if (typeof window !== 'undefined' && window.__RT_FAST__) window.__RT_SOLUTION = sol;
  }

  // ================= 1. COLOR CONFUSION (Stroop) =================
  // A colour word printed in an ink colour. Tap the button matching the INK
  // colour, from 3/4/5 colour-name buttons. The word is never the ink colour.
  function stroopColorCount(round) { return round <= 3 ? 3 : round <= 7 ? 4 : 5; }
  function stroopTimeMs(round) { return round <= 3 ? 5000 : round <= 7 ? 4000 : 3000; }
  function makeStroop(round, rand) {
    rand = rand || Math.random;
    var n = stroopColorCount(round);
    var pool = PALETTE.slice(0, n);
    var word = pool[Math.floor(rand() * pool.length)];
    var ink = pool[Math.floor(rand() * pool.length)];
    while (ink === word) ink = pool[Math.floor(rand() * pool.length)];
    return { word: word.name, ink: ink.name, inkHex: ink.hex, options: pool.map(function (c) { return c.name; }) };
  }
  function renderStroop(container, round, onVerdict, bar) {
    var spec = makeStroop(round);
    var done = false, timers = [];
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); timer.destroy();
      onVerdict(correct, {});
    }
    var word = el('div', 'stroop-word', spec.word);
    word.style.color = spec.inkHex;
    clearEl(container);
    container.appendChild(word);
    container.appendChild(el('p', 'play-hint', 'Tap the button for the INK colour — not the word.'));
    var row = el('div', 'stroop-row');
    spec.options.forEach(function (name) {
      var b = el('button', 'stroop-btn', name);
      b.type = 'button';
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(name === spec.ink); });
      row.appendChild(b);
    });
    container.appendChild(row);
    setSolution({ ink: spec.ink, word: spec.word });
    var timer = makeTimer(bar, stroopTimeMs(round), function () { finish(false); });
    return { destroy: function () { done = true; timers.forEach(clearTimeout); timer.destroy(); } };
  }

  // ================= 2. SCHULTE TABLE =================
  // Grid of shuffled numbers; tap them in ascending order. A wrong tap ends
  // the round as wrong; completing the sequence is correct.
  function schulteSize(round) { return round >= 8 ? 4 : 3; }
  function schulteTimeMs(round) { return round <= 4 ? 20000 : round <= 7 ? 12000 : 20000; }
  function makeSchulte(round, rand) {
    rand = rand || Math.random;
    var n = schulteSize(round) * schulteSize(round);
    var nums = [];
    for (var i = 1; i <= n; i++) nums.push(i);
    for (var j = nums.length - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var t = nums[j]; nums[j] = nums[k]; nums[k] = t;
    }
    return { size: schulteSize(round), numbers: nums, total: n };
  }
  function renderSchulte(container, round, onVerdict, bar) {
    var spec = makeSchulte(round);
    var done = false;
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    var grid = el('div', 'schulte-grid');
    grid.style.gridTemplateColumns = 'repeat(' + spec.size + ', 1fr)';
    var next = 1;
    spec.numbers.forEach(function (num) {
      var b = el('button', 'schulte-cell', String(num));
      b.type = 'button';
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (done) return;
        if (num === next) {
          b.classList.add('done');
          next++;
          hint.textContent = 'Next: ' + next;
          if (next > spec.total) finish(true);
        } else {
          b.classList.add('bad');
          finish(false);
        }
      });
      grid.appendChild(b);
    });
    clearEl(container);
    container.appendChild(grid);
    var hint = el('p', 'play-hint', 'Tap the numbers in order — next: 1');
    container.appendChild(hint);
    setSolution({ numbers: spec.numbers.slice(), total: spec.total });
    var timer = makeTimer(bar, schulteTimeMs(round), function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ================= 3. FLASH CROWD =================
  // Two panels flash dots briefly; tap the side with MORE dots.
  function flashPair(round) {
    var pairs = [[8, 4], [9, 5], [10, 6], [10, 7], [11, 8], [12, 9], [12, 10], [11, 9], [10, 9], [10, 9]];
    return pairs[Math.max(1, Math.min(10, round)) - 1];
  }
  function flashMs(round) { return round >= 8 ? 700 : 1000; }
  function makeFlash(round, rand) {
    rand = rand || Math.random;
    var p = flashPair(round);
    var moreLeft = rand() < 0.5;
    return { left: moreLeft ? p[0] : p[1], right: moreLeft ? p[1] : p[0], moreSide: moreLeft ? 'left' : 'right', flashMs: flashMs(round) };
  }
  function flashPanel(count, rand) {
    var panel = el('div', 'flash-panel');
    for (var i = 0; i < count; i++) {
      var d = el('span', 'flash-dot', '');
      d.style.left = (6 + rand() * 78) + '%';
      d.style.top = (8 + rand() * 76) + '%';
      panel.appendChild(d);
    }
    return panel;
  }
  function renderFlash(container, round, onVerdict, bar) {
    var spec = makeFlash(round);
    var done = false, timers = [], timer = null;
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    var rand = Math.random;
    var wrap = el('div', 'flash-wrap');
    wrap.appendChild(flashPanel(spec.left, rand));
    wrap.appendChild(flashPanel(spec.right, rand));
    clearEl(container);
    container.appendChild(wrap);
    container.appendChild(el('p', 'play-hint', 'Watch the dots… which side had MORE?'));
    setSolution({ moreSide: spec.moreSide });
    timers.push(rtSetTimeout(function () {
      if (done) return;
      // Hide the dots, show two tap targets.
      clearEl(wrap);
      var l = el('button', 'flash-choice', 'LEFT');
      l.type = 'button';
      l.setAttribute('data-side', 'left');
      l.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(spec.moreSide === 'left'); });
      var r = el('button', 'flash-choice', 'RIGHT');
      r.type = 'button';
      r.setAttribute('data-side', 'right');
      r.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(spec.moreSide === 'right'); });
      wrap.appendChild(l); wrap.appendChild(r);
      container.querySelector('.play-hint').textContent = 'Which side had MORE dots? Tap it. You have 5 seconds!';
      timer = makeTimer(bar, 5000, function () { finish(false); });
    }, spec.flashMs, 12));
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (timer) timer.destroy(); } };
  }

  // ================= 4. SPOT THE NEW =================
  // Familiar shapes shown one at a time (1s each), then a grid of 6 shapes
  // appears — exactly one was never shown. Tap the new one.
  function spotNewFamiliarCount(round) { return round <= 3 ? 3 : round <= 6 ? 4 : 5; }
  function makeSpotNew(round, rand) {
    rand = rand || Math.random;
    // 10 distinct shape+colour items; sample familiar + 1 new, shuffle
    // the grid (4-6 shapes: the familiar ones plus the one new shape).
    var items = [];
    SHAPES.forEach(function (shape) {
      PALETTE.slice(0, 2).forEach(function (c) { items.push({ shape: shape, color: c.name, colorHex: c.hex }); });
    });
    var pool = items.slice();
    var familiar = [];
    var n = spotNewFamiliarCount(round);
    for (var i = 0; i < n; i++) familiar.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    var fresh = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    var grid = familiar.concat([fresh]);
    for (var j = grid.length - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var t = grid[j]; grid[j] = grid[k]; grid[k] = t;
    }
    return { familiar: familiar, grid: grid, newIndex: grid.indexOf(fresh) };
  }
  function renderSpotNew(container, round, onVerdict, bar) {
    var spec = makeSpotNew(round);
    var done = false, timers = [], timer = null;
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var stage = el('div', 'spot-stage');
    container.appendChild(stage);
    container.appendChild(el('p', 'play-hint', 'Remember these shapes…'));
    var i = 0;
    function showNext() {
      if (done) return;
      if (i >= spec.familiar.length) { showGrid(); return; }
      clearEl(stage);
      stage.appendChild(shapeItemEl(spec.familiar[i], 72));
      i++;
      timers.push(rtSetTimeout(showNext, 1000, 14));
    }
    function showGrid() {
      if (done) return;
      clearEl(stage);
      var grid = el('div', 'spot-grid');
      spec.grid.forEach(function (item, idx) {
        var b = el('button', 'spot-cell', '');
        b.type = 'button';
        b.appendChild(shapeItemEl(item, 52));
        b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(idx === spec.newIndex); });
        grid.appendChild(b);
      });
      stage.appendChild(grid);
      container.querySelector('.play-hint').textContent = 'Tap the shape you did NOT see before. You have 5 seconds!';
      setSolution({ newIndex: spec.newIndex });
      timer = makeTimer(bar, 5000, function () { finish(false); });
    }
    showNext();
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (timer) timer.destroy(); } };
  }

  // ================= 5. N-BACK =================
  // A stream of 8 shapes, one at a time. Tap MATCH whenever the current
  // shape equals the one N steps back, otherwise tap NO MATCH. Round correct
  // only if every judgment is right. N=1 rounds 1-3, N=2 rounds 4-7, N=3 rounds 8-10.
  function nbackN(round) { return round <= 3 ? 1 : round <= 7 ? 2 : 3; }
  var NBACK_ITEMS = [
    { shape: 'circle', color: 'Red', colorHex: '#c96f5a' },
    { shape: 'square', color: 'Blue', colorHex: '#8aa3b8' },
    { shape: 'triangle', color: 'Green', colorHex: '#7d9b76' },
    { shape: 'star', color: 'Yellow', colorHex: '#d9b36c' },
    { shape: 'diamond', color: 'Purple', colorHex: '#a58bb0' }
  ];
  function makeNBack(round, rand) {
    rand = rand || Math.random;
    var n = nbackN(round);
    var seq = [];
    for (var i = 0; i < 8; i++) seq.push(NBACK_ITEMS[Math.floor(rand() * NBACK_ITEMS.length)]);
    // matches[i] (i >= n): does seq[i] equal seq[i-n]? Force 2-4 matches.
    function countMatches() {
      var m = 0;
      for (var i = n; i < 8; i++) if (seq[i] === seq[i - n]) m++;
      return m;
    }
    var guard = 0;
    while (countMatches() < 2 && guard++ < 20) {
      var a = n + Math.floor(rand() * (8 - n));
      seq[a] = seq[a - n];
    }
    guard = 0;
    while (countMatches() > 4 && guard++ < 20) {
      var b = n + Math.floor(rand() * (8 - n));
      if (seq[b] === seq[b - n]) {
        var others = NBACK_ITEMS.filter(function (it) { return it !== seq[b - n]; });
        seq[b] = others[Math.floor(rand() * others.length)];
      }
    }
    var matches = [];
    for (var j = 0; j < 8; j++) matches.push(j >= n ? seq[j] === seq[j - n] : null);
    return { n: n, sequence: seq, matches: matches };
  }
  function renderNBack(container, round, onVerdict, bar) {
    var spec = makeNBack(round);
    var done = false, timers = [];
    var pos = 0, allRight = true;
    function finish() {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      onVerdict(allRight, {});
    }
    clearEl(container);
    var stage = el('div', 'nback-stage');
    var btnRow = el('div', 'nback-row');
    var matchBtn = el('button', 'nback-btn', 'MATCH');
    matchBtn.type = 'button';
    matchBtn.id = 'nback-match-btn';
    var noBtn = el('button', 'nback-btn', 'NO MATCH');
    noBtn.type = 'button';
    noBtn.id = 'nback-nomatch-btn';
    btnRow.appendChild(matchBtn);
    btnRow.appendChild(noBtn);
    btnRow.style.display = 'none';
    container.appendChild(stage);
    container.appendChild(btnRow);
    container.appendChild(el('p', 'play-hint', 'Watch the shapes…'));
    function setPos(i) {
      pos = i;
      if (typeof window !== 'undefined' && window.__RT_FAST__) window.__RT_POS = i;
    }
    function showItem() {
      if (done) return;
      if (pos >= 8) { finish(); return; }
      clearEl(stage);
      stage.appendChild(shapeItemEl(spec.sequence[pos], 84));
      setSolution({ n: spec.n, matches: spec.matches.slice(), pos: pos });
      setPos(pos);
      if (pos < spec.n) {
        container.querySelector('.play-hint').textContent = 'Watch… (' + (pos + 1) + ' of 8)';
        timers.push(rtSetTimeout(function () { pos++; showItem(); }, 900, 12));
      } else {
        btnRow.style.display = 'flex';
        container.querySelector('.play-hint').textContent = 'Same as ' + spec.n + ' back? (' + (pos + 1) + ' of 8)';
      }
    }
    function judge(isMatch) {
      if (done || pos < spec.n || pos >= 8) return;
      if (isMatch !== spec.matches[pos]) allRight = false;
      btnRow.style.display = 'none';
      pos++;
      showItem();
    }
    matchBtn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); judge(true); });
    noBtn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); judge(false); });
    showItem();
    return { destroy: function () { done = true; timers.forEach(clearTimeout); } };
  }

  // ================= 6. VALUE COMPARISON =================
  // Two simple expressions side by side; tap the one with the higher value
  // (never equal). Bigger numbers and closer values in later rounds. 5s.
  function makeValue(round, rand) {
    rand = rand || Math.random;
    function expr() {
      var kind = rand();
      if (round <= 3) {
        // + or - on single digits, values 2-20.
        var a = 2 + Math.floor(rand() * 8), b = 2 + Math.floor(rand() * 8);
        if (kind < 0.5) return { text: a + ' + ' + b, value: a + b };
        return { text: Math.max(a, b) + ' − ' + Math.min(a, b), value: Math.abs(a - b) };
      }
      if (round <= 7) {
        // small x, or two-digit + / -.
        if (kind < 0.4) {
          var m = 2 + Math.floor(rand() * 7), n = 2 + Math.floor(rand() * 7);
          return { text: m + ' × ' + n, value: m * n };
        }
        var x = 11 + Math.floor(rand() * 30), y = 5 + Math.floor(rand() * 20);
        return { text: x + ' + ' + y, value: x + y };
      }
      // Late: x and + mixes, close values.
      if (kind < 0.5) {
        var p = 3 + Math.floor(rand() * 9), q = 3 + Math.floor(rand() * 9);
        return { text: p + ' × ' + q, value: p * q };
      }
      var u = 12 + Math.floor(rand() * 40), v = 6 + Math.floor(rand() * 30);
      return { text: u + ' + ' + v, value: u + v };
    }
    var a = expr(), b = expr();
    var guard = 0;
    var minGap = round <= 3 ? 5 : round <= 7 ? 3 : 1;
    while ((a.value === b.value || Math.abs(a.value - b.value) < minGap) && guard++ < 60) b = expr();
    if (a.value === b.value) b = { text: b.text + ' + 1', value: b.value + 1 };
    return { a: a, b: b };
  }
  function renderValue(container, round, onVerdict, bar) {
    var spec = makeValue(round);
    var done = false;
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var row = el('div', 'value-row');
    var ba = el('button', 'value-btn', spec.a.text);
    ba.type = 'button';
    ba.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(spec.a.value > spec.b.value); });
    var bb = el('button', 'value-btn', spec.b.text);
    bb.type = 'button';
    bb.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(spec.b.value > spec.a.value); });
    row.appendChild(ba); row.appendChild(bb);
    container.appendChild(row);
    container.appendChild(el('p', 'play-hint', 'Tap the one with the higher value. You have 5 seconds!'));
    setSolution({ aValue: spec.a.value, bValue: spec.b.value });
    var timer = makeTimer(bar, 5000, function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ================= 7. MENTAL FLEX =================
  // A cue pair shares one trait (colour, shape, or size) — that is the rule.
  // Then a target and 3 options appear. Tap the option matching the target
  // on the cued trait. 5s to answer.
  var FLEX_TRAITS = ['colour', 'shape', 'size'];
  var FLEX_SIZES = ['small', 'medium', 'large'];
  var FLEX_SIZE_PX = { small: 28, medium: 44, large: 60 };
  function flexItem(rand) {
    rand = rand || Math.random;
    var c = PALETTE[Math.floor(rand() * PALETTE.length)];
    return {
      shape: SHAPES[Math.floor(rand() * SHAPES.length)],
      color: c.name, colorHex: c.hex,
      size: FLEX_SIZES[Math.floor(rand() * FLEX_SIZES.length)]
    };
  }
  // Build an item that matches `base` on exactly the kept trait and differs
  // on the other two (deterministic — no retry loop that can give up).
  function flexItemWith(base, keepTrait, rand) {
    rand = rand || Math.random;
    var item = { shape: base.shape, color: base.color, colorHex: base.colorHex, size: base.size };
    if (keepTrait !== 'colour') {
      var c;
      do { c = PALETTE[Math.floor(rand() * PALETTE.length)]; } while (c.name === base.color);
      item.color = c.name; item.colorHex = c.hex;
    }
    if (keepTrait !== 'shape') {
      var s;
      do { s = SHAPES[Math.floor(rand() * SHAPES.length)]; } while (s === base.shape);
      item.shape = s;
    }
    if (keepTrait !== 'size') {
      var z;
      do { z = FLEX_SIZES[Math.floor(rand() * FLEX_SIZES.length)]; } while (z === base.size);
      item.size = z;
    }
    return item;
  }
  function makeFlex(round, rand) {
    rand = rand || Math.random;
    var trait = FLEX_TRAITS[Math.floor(rand() * FLEX_TRAITS.length)];
    // Cue pair: share the trait, differ on the other two.
    var cueA = flexItem(rand);
    var cueB = flexItemWith(cueA, trait, rand);
    var target = flexItem(rand);
    // Correct option: matches target on the cued trait, differs on the others.
    var correct = flexItemWith(target, trait, rand);
    // Distractors: do NOT match the target on the cued trait. In later
    // rounds they match on one other trait (a trap); early rounds match none.
    var options = [correct];
    var tries = 0;
    while (options.length < 3 && tries++ < 200) {
      var d = flexItem(rand);
      var matchesTrait = trait === 'colour' ? d.color === target.color
        : trait === 'shape' ? d.shape === target.shape : d.size === target.size;
      if (matchesTrait) continue;
      var otherMatches = (d.color === target.color ? 1 : 0) + (d.shape === target.shape ? 1 : 0) + (d.size === target.size ? 1 : 0);
      if (round >= 4 && otherMatches < 1) continue; // later rounds: trap options
      if (round <= 3 && otherMatches > 0) continue; // early rounds: clean distractors
      if (options.some(function (o) { return o.shape === d.shape && o.color === d.color && o.size === d.size; })) continue;
      options.push(d);
    }
    // Shuffle options.
    for (var i = options.length - 1; i > 0; i--) {
      var k = Math.floor(rand() * (i + 1));
      var t = options[i]; options[i] = options[k]; options[k] = t;
    }
    return { trait: trait, cueA: cueA, cueB: cueB, target: target, options: options, correctIndex: options.indexOf(correct) };
  }
  function flexChip(item, sizePx) {
    var chip = el('div', 'flex-chip');
    chip.appendChild(shapeEl(item.shape, item.colorHex, sizePx || FLEX_SIZE_PX[item.size]));
    return chip;
  }
  function renderFlex(container, round, onVerdict, bar) {
    var spec = makeFlex(round);
    var done = false;
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var cueRow = el('div', 'flex-cue-row');
    cueRow.appendChild(flexChip(spec.cueA, 44));
    cueRow.appendChild(el('span', 'flex-plus', '+'));
    cueRow.appendChild(flexChip(spec.cueB, 44));
    cueRow.appendChild(el('span', 'flex-rule', 'Same: ' + spec.trait));
    container.appendChild(cueRow);
    container.appendChild(el('p', 'play-hint', 'Match the target on the SAME trait. You have 5 seconds!'));
    var tgtRow = el('div', 'flex-target-row');
    tgtRow.appendChild(el('span', 'flex-label', 'Target:'));
    tgtRow.appendChild(flexChip(spec.target, 44));
    container.appendChild(tgtRow);
    var optRow = el('div', 'flex-opt-row');
    spec.options.forEach(function (opt, idx) {
      var b = el('button', 'flex-opt', '');
      b.type = 'button';
      b.appendChild(flexChip(opt, 44));
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(idx === spec.correctIndex); });
      optRow.appendChild(b);
    });
    container.appendChild(optRow);
    setSolution({ correctIndex: spec.correctIndex });
    var timer = makeTimer(bar, 5000, function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ---- pure APIs, exposed for the harness ----
  C.PALETTE = PALETTE; C.SHAPES = SHAPES;
  C.stroopColorCount = stroopColorCount; C.stroopTimeMs = stroopTimeMs; C.makeStroop = makeStroop;
  C.schulteSize = schulteSize; C.schulteTimeMs = schulteTimeMs; C.makeSchulte = makeSchulte;
  C.flashPair = flashPair; C.flashMs = flashMs; C.makeFlash = makeFlash;
  C.spotNewFamiliarCount = spotNewFamiliarCount; C.makeSpotNew = makeSpotNew;
  C.nbackN = nbackN; C.makeNBack = makeNBack;
  C.makeValue = makeValue;
  C.makeFlex = makeFlex;
  // ---- registry: original three renderers + the new ones ----
  var renderers = {};
  C.renderers = renderers;
  C.render = function (id, container, round, onVerdict, bar) {
    var r = renderers[id];
    if (!r) throw new Error('unknown challenge ' + id);
    return r(container, round, onVerdict, bar);
  };
  renderers.memory = C.renderMemory;
  renderers.odd = C.renderOdd;
  renderers.color = C.renderColor;
  renderers.stroop = renderStroop;
  renderers.schulte = renderSchulte;
  renderers.flash = renderFlash;
  renderers.spotnew = renderSpotNew;
  renderers.nback = renderNBack;
  renderers.value = renderValue;
  renderers.flex = renderFlex;

  // ================= 8. VISUAL MEMORY =================
  // 4-6 shapes shown briefly, then hidden; the same set returns with exactly
  // one shape changed. Tap the changed one. 5s to answer.
  function vismemCount(round) { return round <= 3 ? 4 : round <= 6 ? 5 : 6; }
  function vismemShowMs(round) { return round <= 3 ? 3000 : round <= 6 ? 2500 : 2000; }
  function makeVisMem(round, rand) {
    rand = rand || Math.random;
    var n = vismemCount(round);
    var items = [];
    var used = {};
    while (items.length < n) {
      var shape = SHAPES[Math.floor(rand() * SHAPES.length)];
      var c = PALETTE[Math.floor(rand() * PALETTE.length)];
      var key = shape + '|' + c.name;
      if (used[key]) continue;
      used[key] = true;
      items.push({ shape: shape, color: c.name, colorHex: c.hex });
    }
    var changedIndex = Math.floor(rand() * n);
    var changed = { shape: items[changedIndex].shape, color: items[changedIndex].color, colorHex: items[changedIndex].colorHex };
    // Change exactly one trait: a different colour, or a different shape.
    if (rand() < 0.5) {
      var others = PALETTE.filter(function (c) { return c.name !== changed.color; });
      var nc = others[Math.floor(rand() * others.length)];
      changed.color = nc.name; changed.colorHex = nc.hex;
    } else {
      var os = SHAPES.filter(function (s) { return s !== changed.shape; });
      changed.shape = os[Math.floor(rand() * os.length)];
    }
    var after = items.slice();
    after[changedIndex] = changed;
    return { before: items, after: after, changedIndex: changedIndex };
  }
  function vismemGrid(items) {
    var grid = el('div', 'vismem-grid');
    items.forEach(function (item) {
      var cell = el('div', 'vismem-cell', '');
      cell.appendChild(shapeItemEl(item, 52));
      grid.appendChild(cell);
    });
    return grid;
  }
  function renderVisMem(container, round, onVerdict, bar) {
    var spec = makeVisMem(round);
    var done = false, timers = [], timer = null;
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var stage = el('div', 'vismem-stage');
    container.appendChild(stage);
    var hint = el('p', 'play-hint', 'Look at the shapes…');
    container.appendChild(hint);
    stage.appendChild(vismemGrid(spec.before));
    setSolution({ changedIndex: spec.changedIndex });
    timers.push(rtSetTimeout(function () {
      if (done) return;
      // Hide briefly, then show the set with one change.
      clearEl(stage);
      stage.appendChild(el('div', 'vismem-hidden', '…'));
      hint.textContent = 'One shape changed. Which one?';
      timers.push(rtSetTimeout(function () {
        if (done) return;
        clearEl(stage);
        var grid = vismemGrid(spec.after);
        // Copy the live child list first — replacing nodes while iterating
        // a live HTMLCollection would skip cells.
        Array.prototype.slice.call(grid.children).forEach(function (cell, idx) {
          var b = el('button', 'vismem-pick', '');
          b.type = 'button';
          b.appendChild(cell.firstChild);
          cell.replaceWith(b);
          b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(idx === spec.changedIndex); });
        });
        stage.appendChild(grid);
        hint.textContent = 'Tap the changed shape. You have 5 seconds!';
        timer = makeTimer(bar, 5000, function () { finish(false); });
      }, 600, 10));
    }, vismemShowMs(round), 14));
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (timer) timer.destroy(); } };
  }

  // ================= 9. QUICK SUM =================
  // Numbers flash one at a time (800ms each); then an on-screen keypad
  // (0-9 + enter) to type the total. Exact total is correct. 10s to enter.
  function quicksumCount(round) { return round <= 3 ? 3 : round <= 6 ? 4 : 5; }
  function makeQuickSum(round, rand) {
    rand = rand || Math.random;
    var n = quicksumCount(round);
    var lo = round <= 3 ? 2 : round <= 6 ? 3 : 5;
    var hi = round <= 3 ? 9 : round <= 6 ? 15 : 25;
    var numbers = [];
    for (var i = 0; i < n; i++) numbers.push(lo + Math.floor(rand() * (hi - lo + 1)));
    return { numbers: numbers, total: numbers.reduce(function (a, b) { return a + b; }, 0) };
  }
  function renderQuickSum(container, round, onVerdict, bar) {
    var spec = makeQuickSum(round);
    var done = false, timers = [], timer = null, typed = '';
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var stage = el('div', 'quicksum-stage');
    container.appendChild(stage);
    var hint = el('p', 'play-hint', 'Watch the numbers…');
    container.appendChild(hint);
    var i = 0;
    function flashNext() {
      if (done) return;
      if (i >= spec.numbers.length) { showKeypad(); return; }
      stage.textContent = String(spec.numbers[i]);
      stage.className = 'quicksum-stage quicksum-num';
      i++;
      timers.push(rtSetTimeout(flashNext, 800, 12));
    }
    function showKeypad() {
      if (done) return;
      clearEl(stage);
      var kp = buildKeypad(function (d) {
        if (typed.length < 4) { typed += d; kp.display.textContent = typed; }
      }, function () {
        if (typed === '') return;
        finish(parseInt(typed, 10) === spec.total);
      }, function () { typed = ''; kp.display.textContent = ''; });
      kp.display.textContent = '';
      stage.appendChild(kp.el);
      hint.textContent = 'Type the total, then Enter. You have 10 seconds!';
      setSolution({ total: spec.total });
      timer = makeTimer(bar, 10000, function () { finish(false); });
    }
    flashNext();
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (timer) timer.destroy(); } };
  }

  // ================= 10. BUBBLE SUM =================
  // A target total is shown with 4-6 bubbles carrying numbers; tap the TWO
  // bubbles that add up to the target (exactly one pair works). 8s.
  function bubbleCount(round) { return round <= 3 ? 4 : round <= 6 ? 5 : 6; }
  function makeBubble(round, rand) {
    rand = rand || Math.random;
    var n = bubbleCount(round);
    var lo = round <= 3 ? 2 : round <= 6 ? 3 : 5;
    var hi = round <= 3 ? 12 : round <= 6 ? 20 : 30;
    for (var attempt = 0; attempt < 200; attempt++) {
      var target = lo * 2 + Math.floor(rand() * (hi * 2 - lo * 2 + 1));
      var a = lo + Math.floor(rand() * (hi - lo + 1));
      var b = target - a;
      if (b < lo || b > hi || a === b) continue;
      var bubbles = [a, b];
      while (bubbles.length < n) bubbles.push(lo + Math.floor(rand() * (hi - lo + 1)));
      // Exactly one working pair? Check all pairs.
      var pairs = [];
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (bubbles[i] + bubbles[j] === target) pairs.push([i, j]);
      if (pairs.length !== 1) continue;
      // Shuffle so the pair is not always first.
      for (var k = bubbles.length - 1; k > 0; k--) {
        var m = Math.floor(rand() * (k + 1));
        var t = bubbles[k]; bubbles[k] = bubbles[m]; bubbles[m] = t;
      }
      pairs = [];
      for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) if (bubbles[p] + bubbles[q] === target) pairs.push([p, q]);
      return { target: target, bubbles: bubbles, pair: pairs[0] };
    }
    // Fallback (practically unreachable): a simple guaranteed board.
    // Only 3+7 make 10 among these numbers.
    return { target: 10, bubbles: [3, 7, 2, 9, 4, 12].slice(0, n), pair: [0, 1] };
  }
  function renderBubble(container, round, onVerdict, bar) {
    var spec = makeBubble(round);
    var done = false, picked = [];
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var targetEl = el('div', 'bubble-target', 'Make ' + spec.target);
    container.appendChild(targetEl);
    var row = el('div', 'bubble-row');
    spec.bubbles.forEach(function (num, idx) {
      var b = el('button', 'bubble', String(num));
      b.type = 'button';
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (done) return;
        if (picked.indexOf(idx) >= 0) {
          picked = picked.filter(function (x) { return x !== idx; });
          b.classList.remove('picked');
          return;
        }
        picked.push(idx);
        b.classList.add('picked');
        if (picked.length === 2) {
          var sum = spec.bubbles[picked[0]] + spec.bubbles[picked[1]];
          finish(sum === spec.target);
        }
      });
      row.appendChild(b);
    });
    container.appendChild(row);
    container.appendChild(el('p', 'play-hint', 'Tap TWO bubbles that add up to the target. You have 8 seconds!'));
    setSolution({ pair: spec.pair.slice() });
    var timer = makeTimer(bar, 8000, function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ================= 11. TRIO =================
  // 9 cards, each with a shape, a count and a fill. Tap 3 cards that form a
  // valid set: on every trait, all three same or all three different.
  // Later rounds have fewer valid sets. 15s.
  var TRIO_SHAPES = ['circle', 'square', 'triangle'];
  var TRIO_FILLS = ['solid', 'dots', 'half'];
  function trioIsSet(a, b, c) {
    function traitOk(x, y, z) { return (x === y && y === z) || (x !== y && y !== z && x !== z); }
    return traitOk(a.shape, b.shape, c.shape) && traitOk(a.count, b.count, c.count) && traitOk(a.fill, b.fill, c.fill);
  }
  function trioSets(cards) {
    var sets = [];
    for (var i = 0; i < 9; i++) for (var j = i + 1; j < 9; j++) for (var k = j + 1; k < 9; k++) {
      if (trioIsSet(cards[i], cards[j], cards[k])) sets.push([i, j, k]);
    }
    return sets;
  }
  function makeTrio(round, rand) {
    rand = rand || Math.random;
    var all = [];
    TRIO_SHAPES.forEach(function (s) {
      [1, 2, 3].forEach(function (n) {
        TRIO_FILLS.forEach(function (f) { all.push({ shape: s, count: n, fill: f }); });
      });
    });
    var maxSets = round <= 3 ? 99 : round <= 7 ? 3 : 1;
    for (var attempt = 0; attempt < 300; attempt++) {
      var pool = all.slice();
      var cards = [];
      for (var i = 0; i < 9; i++) cards.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      var sets = trioSets(cards);
      if (sets.length >= 1 && sets.length <= maxSets) return { cards: cards, sets: sets };
    }
    // Fallback: a board with exactly one known set.
    var cards = [
      { shape: 'circle', count: 1, fill: 'solid' }, { shape: 'circle', count: 2, fill: 'dots' },
      { shape: 'circle', count: 3, fill: 'half' }, { shape: 'square', count: 1, fill: 'dots' },
      { shape: 'square', count: 2, fill: 'half' }, { shape: 'square', count: 3, fill: 'solid' },
      { shape: 'triangle', count: 1, fill: 'half' }, { shape: 'triangle', count: 2, fill: 'solid' },
      { shape: 'triangle', count: 3, fill: 'dots' }
    ];
    return { cards: cards, sets: trioSets(cards) };
  }
  function trioFillBg(fill, hex) {
    if (fill === 'solid') return hex;
    if (fill === 'dots') return '#fffdf8';
    return 'linear-gradient(180deg, ' + hex + ' 50%, rgba(255,253,248,0) 50%)';
  }
  function trioCardEl(card) {
    var d = el('div', 'trio-card', '');
    for (var i = 0; i < card.count; i++) {
      var s = el('span', 'odd-shape shape-' + card.shape, '');
      s.style.width = '26px'; s.style.height = '26px';
      if (card.fill === 'solid') { s.style.background = '#8aa3b8'; }
      else if (card.fill === 'dots') {
        s.style.background = '#fffdf8';
        s.style.backgroundImage = 'radial-gradient(#8aa3b8 32%, transparent 34%)';
        s.style.backgroundSize = '9px 9px';
      } else {
        s.style.background = 'linear-gradient(180deg, #8aa3b8 50%, rgba(255,253,248,0) 50%)';
      }
      d.appendChild(s);
    }
    return d;
  }
  function renderTrio(container, round, onVerdict, bar) {
    var spec = makeTrio(round);
    var done = false, picked = [];
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var grid = el('div', 'trio-grid');
    spec.cards.forEach(function (card, idx) {
      var b = el('button', 'trio-cell', '');
      b.type = 'button';
      b.appendChild(trioCardEl(card));
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (done) return;
        if (picked.indexOf(idx) >= 0) {
          picked = picked.filter(function (x) { return x !== idx; });
          b.classList.remove('picked');
          return;
        }
        picked.push(idx);
        b.classList.add('picked');
        if (picked.length === 3) {
          finish(trioIsSet(spec.cards[picked[0]], spec.cards[picked[1]], spec.cards[picked[2]]));
        }
      });
      grid.appendChild(b);
    });
    container.appendChild(grid);
    container.appendChild(el('p', 'play-hint', 'Tap THREE cards that make a set — every trait all same or all different. You have 15 seconds!'));
    setSolution({ sets: spec.sets.map(function (s) { return s.slice(); }) });
    var timer = makeTimer(bar, 15000, function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ================= 12. PATTERN SEQUENCE =================
  // A 3x3 grid where each row follows a rule, with the last cell missing;
  // tap the correct completion from 4 options. 10s.
  // Cell: { shape, count, fill, rot }. Rules by band:
  //  1-3 'count': counts 1,2,3 across columns; shape differs per row.
  //  4-7 'twotrait': counts 1,2,3 + fills solid,dots,half across columns.
  //  8-10 'rotation': counts 1,2,3 + rotations 0,90,180 across columns.
  function makePattern(round, rand) {
    rand = rand || Math.random;
    var kind = round <= 3 ? 'count' : round <= 7 ? 'twotrait' : 'rotation';
    var rowShapes = [];
    while (rowShapes.length < 3) {
      var s = SHAPES[Math.floor(rand() * SHAPES.length)];
      if (rowShapes.indexOf(s) < 0) rowShapes.push(s);
    }
    var fills = ['solid', 'dots', 'half'];
    var rots = [0, 90, 180];
    function cell(r, c) {
      return {
        shape: rowShapes[r], count: c + 1,
        fill: kind === 'twotrait' ? fills[c] : 'solid',
        rot: kind === 'rotation' ? rots[c] : 0
      };
    }
    var grid = [];
    for (var r = 0; r < 3; r++) {
      var row = [];
      for (var c = 0; c < 3; c++) row.push((r === 2 && c === 2) ? null : cell(r, c));
      grid.push(row);
    }
    var correct = cell(2, 2);
    var distractors = [
      { shape: correct.shape, count: correct.count === 3 ? 2 : 3, fill: correct.fill, rot: correct.rot },
      { shape: correct.shape, count: kind === 'count' ? 1 : correct.count, fill: kind === 'twotrait' ? (correct.fill === 'solid' ? 'dots' : 'solid') : correct.fill, rot: kind === 'rotation' ? (correct.rot === 180 ? 90 : 180) : correct.rot },
      { shape: rowShapes[1], count: correct.count, fill: correct.fill, rot: correct.rot }
    ];
    var options = [correct].concat(distractors);
    for (var i = options.length - 1; i > 0; i--) {
      var k = Math.floor(rand() * (i + 1));
      var t = options[i]; options[i] = options[k]; options[k] = t;
    }
    return { kind: kind, grid: grid, options: options, correctIndex: options.indexOf(correct) };
  }
  function patternCellEl(cell) {
    var d = el('div', 'pat-cell', '');
    if (!cell) { d.textContent = '?'; d.classList.add('pat-missing'); return d; }
    for (var i = 0; i < cell.count; i++) {
      var s = el('span', 'odd-shape shape-' + cell.shape, '');
      s.style.width = '22px'; s.style.height = '22px';
      if (cell.fill === 'solid') s.style.background = '#8aa3b8';
      else if (cell.fill === 'dots') {
        s.style.background = '#fffdf8';
        s.style.backgroundImage = 'radial-gradient(#8aa3b8 32%, transparent 34%)';
        s.style.backgroundSize = '8px 8px';
      } else s.style.background = 'linear-gradient(180deg, #8aa3b8 50%, rgba(255,253,248,0) 50%)';
      if (cell.rot) s.style.transform = 'rotate(' + cell.rot + 'deg)';
      d.appendChild(s);
    }
    return d;
  }
  function renderPattern(container, round, onVerdict, bar) {
    var spec = makePattern(round);
    var done = false;
    function finish(correct) {
      if (done) return; done = true;
      timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var grid = el('div', 'pat-grid');
    spec.grid.forEach(function (row) {
      row.forEach(function (cell) { grid.appendChild(patternCellEl(cell)); });
    });
    container.appendChild(grid);
    var opts = el('div', 'pat-opts');
    spec.options.forEach(function (opt, idx) {
      var b = el('button', 'pat-opt', '');
      b.type = 'button';
      b.appendChild(patternCellEl(opt));
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); finish(idx === spec.correctIndex); });
      opts.appendChild(b);
    });
    container.appendChild(opts);
    container.appendChild(el('p', 'play-hint', 'Tap the piece that completes the last row. You have 10 seconds!'));
    setSolution({ correctIndex: spec.correctIndex });
    var timer = makeTimer(bar, 10000, function () { finish(false); });
    return { destroy: function () { done = true; timer.destroy(); } };
  }

  // ================= 13. ORBIT TRACKER =================
  // 6-8 balls on screen, 2 highlighted at the start; all balls then move
  // around for 3-4s. Tap the 2 originally highlighted balls.
  function orbitCount(round) { return round <= 3 ? 6 : 8; }
  function orbitMoveMs(round) { return round >= 8 ? 4000 : 3000; }
  function orbitSpeed(round) { return round >= 8 ? 4.5 : 2.5; }
  function makeOrbit(round, rand) {
    rand = rand || Math.random;
    var n = orbitCount(round);
    var a = Math.floor(rand() * n), b = Math.floor(rand() * n);
    while (b === a) b = Math.floor(rand() * n);
    return { n: n, targets: [a, b].sort(function (x, y) { return x - y; }) };
  }
  function renderOrbit(container, round, onVerdict, bar) {
    var spec = makeOrbit(round);
    // Reset the harness hook each round (it is only set in fast mode).
    if (typeof window !== 'undefined' && window.__RT_FAST__) window.__RT_ORBIT_READY = false;
    var done = false, timers = [], interval = null, timer = null;
    var picked = [];
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (interval) clearInterval(interval); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var box = el('div', 'orbit-box');
    container.appendChild(box);
    var hint = el('p', 'play-hint', 'Remember the two coral balls…');
    container.appendChild(hint);
    var W = 640, H = 260, R = 16;
    var balls = [];
    for (var i = 0; i < spec.n; i++) {
      var b = el('div', 'orbit-ball' + (spec.targets.indexOf(i) >= 0 ? ' target' : ''), '');
      var x = R + Math.random() * (W - 2 * R), y = R + Math.random() * (H - 2 * R);
      var ang = Math.random() * Math.PI * 2, sp = orbitSpeed(round);
      balls.push({ el: b, x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp });
      b.style.left = x + 'px'; b.style.top = y + 'px';
      box.appendChild(b);
    }
    setSolution({ targets: spec.targets.slice(), n: spec.n });
    // Highlight phase, then movement, then stop and let the player tap.
    timers.push(rtSetTimeout(function () {
      if (done) return;
      balls.forEach(function (ball) { ball.el.classList.remove('target'); });
      hint.textContent = 'Watch them move…';
      interval = setInterval(function () {
        balls.forEach(function (ball) {
          ball.x += ball.vx; ball.y += ball.vy;
          if (ball.x < R || ball.x > W - R) ball.vx *= -1;
          if (ball.y < R || ball.y > H - R) ball.vy *= -1;
          ball.x = Math.max(R, Math.min(W - R, ball.x));
          ball.y = Math.max(R, Math.min(H - R, ball.y));
          ball.el.style.left = ball.x + 'px';
          ball.el.style.top = ball.y + 'px';
        });
      }, 40);
      timers.push(rtSetTimeout(function () {
        if (done) return;
        if (interval) clearInterval(interval);
        interval = null;
        hint.textContent = 'Tap the TWO balls that were coral at the start.';
        if (typeof window !== 'undefined' && window.__RT_FAST__) window.__RT_ORBIT_READY = true;
        balls.forEach(function (ball, idx) {
          ball.el.addEventListener('pointerdown', function (ev) {
            ev.preventDefault();
            if (done) return;
            if (picked.indexOf(idx) >= 0) {
              picked = picked.filter(function (x) { return x !== idx; });
              ball.el.classList.remove('picked');
              return;
            }
            picked.push(idx);
            ball.el.classList.add('picked');
            if (picked.length === 2) {
              var s = picked.slice().sort(function (a, b) { return a - b; });
              finish(s[0] === spec.targets[0] && s[1] === spec.targets[1]);
            }
          });
        });
        timer = makeTimer(bar, 10000, function () { finish(false); });
      }, orbitMoveMs(round), 40));
    }, 1500, 16));
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (interval) clearInterval(interval); if (timer) timer.destroy(); } };
  }

  // ================= 14. DIGIT MEMORY =================
  // 5-7 digits shown briefly, then a quick sum question (a distraction —
  // it does not change the verdict), then recall the digits in order on
  // the keypad. Correct only if all digits are right in order.
  function digitmemCount(round) { return round <= 3 ? 5 : round <= 6 ? 6 : 7; }
  function digitmemShowMs(round) { return round <= 3 ? 3000 : round <= 6 ? 2500 : 2000; }
  function makeDigitMem(round, rand) {
    rand = rand || Math.random;
    var n = digitmemCount(round);
    var digits = [];
    for (var i = 0; i < n; i++) digits.push(Math.floor(rand() * 10));
    var a = 2 + Math.floor(rand() * 8), b = 2 + Math.floor(rand() * 8);
    return { digits: digits, sumQ: { a: a, b: b, answer: a + b } };
  }
  function renderDigitMem(container, round, onVerdict, bar) {
    var spec = makeDigitMem(round);
    var done = false, timers = [], timer = null;
    function finish(correct) {
      if (done) return; done = true;
      timers.forEach(clearTimeout); if (timer) timer.destroy();
      onVerdict(correct, {});
    }
    clearEl(container);
    var stage = el('div', 'digitmem-stage');
    container.appendChild(stage);
    var hint = el('p', 'play-hint', 'Remember these digits, in order…');
    container.appendChild(hint);
    stage.textContent = spec.digits.join('  ');
    stage.className = 'digitmem-stage digitmem-digits';
    setSolution({ digits: spec.digits.slice(), sumAnswer: spec.sumQ.answer });
    timers.push(rtSetTimeout(function () {
      if (done) return;
      // Phase 2: quick sum distraction on the keypad (10s; timing out just moves on).
      clearEl(stage);
      stage.textContent = spec.sumQ.a + ' + ' + spec.sumQ.b + ' = ?';
      stage.className = 'digitmem-stage digitmem-sum';
      hint.textContent = 'Quick sum first — just a distraction. Type it, then Enter.';
      var typed = '';
      var kp = buildKeypad(function (d) {
        if (typed.length < 3) { typed += d; kp.display.textContent = typed; }
      }, function () { showRecall(); }, function () { typed = ''; kp.display.textContent = ''; });
      stage.appendChild(kp.el);
      var sumTimer = makeTimer(bar, 10000, function () { showRecall(); });
      var recalled = false;
      function showRecall() {
        if (done || recalled) return;
        recalled = true;
        sumTimer.destroy();
        clearEl(stage);
        hint.textContent = 'Now type the digits back, in order. You have 15 seconds!';
        var typed2 = '';
        var kp2 = buildKeypad(function (d) {
          if (typed2.length < spec.digits.length) {
            typed2 += d;
            kp2.display.textContent = typed2.split('').join(' ');
            if (typed2.length === spec.digits.length) {
              finish(typed2.split('').map(Number).every(function (v, i) { return v === spec.digits[i]; }));
            }
          }
        }, function () {
          if (typed2.length === spec.digits.length) {
            finish(typed2.split('').map(Number).every(function (v, i) { return v === spec.digits[i]; }));
          }
        }, function () { typed2 = ''; kp2.display.textContent = ''; });
        stage.appendChild(kp2.el);
        timer = makeTimer(bar, 15000, function () { finish(false); });
      }
    }, digitmemShowMs(round), 14));
    return { destroy: function () { done = true; timers.forEach(clearTimeout); if (timer) timer.destroy(); } };
  }

  // ---- register the new renderers + expose pure APIs ----
  renderers.vismem = renderVisMem;
  renderers.quicksum = renderQuickSum;
  renderers.bubble = renderBubble;
  renderers.trio = renderTrio;
  renderers.pattern = renderPattern;
  renderers.orbit = renderOrbit;
  renderers.digitmem = renderDigitMem;
  C.vismemCount = vismemCount; C.vismemShowMs = vismemShowMs; C.makeVisMem = makeVisMem;
  C.quicksumCount = quicksumCount; C.makeQuickSum = makeQuickSum;
  C.bubbleCount = bubbleCount; C.makeBubble = makeBubble;
  C.trioIsSet = trioIsSet; C.trioSets = trioSets; C.makeTrio = makeTrio;
  C.makePattern = makePattern;
  C.orbitCount = orbitCount; C.orbitMoveMs = orbitMoveMs; C.orbitSpeed = orbitSpeed; C.makeOrbit = makeOrbit;
  C.digitmemCount = digitmemCount; C.digitmemShowMs = digitmemShowMs; C.makeDigitMem = makeDigitMem;
})(typeof window !== 'undefined' ? window : globalThis);
