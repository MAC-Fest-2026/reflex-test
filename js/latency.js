// Reflex Test — latency self-test (PRD §6).
// A measuring instrument needs a measured stall: this panel flashes a target
// and records event.timeStamp against the painted-frame timestamp on each
// pointerdown. 20 clicks. Pass: average <= 50 ms, no single click over 80 ms.
// Re-run after any change of laptop, mouse, or browser on fest day.
// Pure math (recordClick / summarize) is testable from node.
(function (global) {
  'use strict';

  var CLICKS_NEEDED = 20;
  var PASS_AVG_MS = 50;
  var PASS_WORST_MS = 80;

  // One click: ms between the frame that painted the target and the
  // pointerdown event. Both timestamps share the performance.now() clock.
  function recordClick(paintTs, eventTs) { return Math.round(eventTs - paintTs); }

  function summarize(samples) {
    if (!samples || samples.length === 0) return { n: 0, avg: null, worst: null, pass: false };
    var sum = 0, worst = -Infinity;
    for (var i = 0; i < samples.length; i++) {
      sum += samples[i];
      if (samples[i] > worst) worst = samples[i];
    }
    var avg = sum / samples.length;
    return {
      n: samples.length,
      avg: Math.round(avg * 10) / 10,
      worst: worst,
      pass: samples.length >= CLICKS_NEEDED && avg <= PASS_AVG_MS && worst <= PASS_WORST_MS
    };
  }

  // DOM panel. els: { box, target, status, progress, result }.
  // onDone(summary) called after the 20th click.
  function runLatencyTest(els, onDone) {
    var samples = [];
    var paintTs = null, waiting = false, done = false;
    var waitTimer = null;

    function setStatus(t) { els.status.textContent = t; }
    function setProgress() { els.progress.textContent = samples.length + ' / ' + CLICKS_NEEDED + ' clicks'; }

    function flashTarget() {
      if (done) return;
      // Random delay before the flash so the player cannot pre-click.
      // Fast-test mode (window.__RT_FAST__) shrinks it for the harness.
      var fast = (typeof window !== 'undefined' && window.__RT_FAST__);
      var delay = fast ? 10 + Math.random() * 20 : 400 + Math.random() * 800;
      setStatus('Get ready…');
      els.target.classList.add('hidden-target');
      waitTimer = setTimeout(function () {
        if (done) return;
        requestAnimationFrame(function (frameTs) {
          if (done) return;
          paintTs = frameTs;
          waiting = true;
          // Random spot inside the box.
          var box = els.box.getBoundingClientRect();
          var x = 8 + Math.random() * Math.max(8, box.width - 120);
          var y = 8 + Math.random() * Math.max(8, box.height - 120);
          els.target.style.left = x + 'px';
          els.target.style.top = y + 'px';
          els.target.classList.remove('hidden-target');
          els.target.classList.add('flash');
          setStatus('CLICK IT!');
        });
      }, delay);
    }

    els.target.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      if (done || !waiting) return;
      waiting = false;
      els.target.classList.remove('flash');
      var ms = recordClick(paintTs, ev.timeStamp);
      samples.push(ms);
      setProgress();
      if (samples.length >= CLICKS_NEEDED) {
        done = true;
        var s = summarize(samples);
        els.result.textContent = 'Average: ' + s.avg + ' ms · Worst: ' + s.worst + ' ms — ' +
          (s.pass ? 'PASS. This stall is fast enough.' : 'FAIL. Change one thing (wired mouse, close other tabs, mains power, no battery-saver) and re-run.');
        els.result.className = s.pass ? 'latency-pass' : 'latency-fail';
        setStatus('Done.');
        if (onDone) onDone(s);
        return;
      }
      flashTarget();
    });

    setProgress();
    setStatus('');
    els.result.textContent = '';
    els.result.className = '';
    flashTarget();
    return {
      destroy: function () { done = true; if (waitTimer) clearTimeout(waitTimer); },
      samples: function () { return samples.slice(); }
    };
  }

  var api = {
    CLICKS_NEEDED: CLICKS_NEEDED,
    PASS_AVG_MS: PASS_AVG_MS,
    PASS_WORST_MS: PASS_WORST_MS,
    recordClick: recordClick,
    summarize: summarize,
    runLatencyTest: runLatencyTest
  };
  if (typeof window !== 'undefined') window.ReflexLatency = api;
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
