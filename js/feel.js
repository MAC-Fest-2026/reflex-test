// Reflex Test — the freaky FEEL layer (memes + sounds + triggers + MLG layer).
// The UI is freaky now too (Math Roast style): this file also drives the
// colour flashes, the screen shake and the flying MLG layer. Scoring,
// games, instructions and best scores live in game.js / challenges*.
// No TTS anywhere here — reactions use real paired mp3s only. (The one
// SpeechSynthesis in the game is the instruction-screen narration in
// game.js, by the user's explicit choice.)
(function (global) {
  'use strict';

  var MEMES = global.MEMES || (typeof require !== 'undefined' ? null : null);
  function memes() { return (typeof window !== 'undefined' && window.MEMES) || MEMES || null; }

  // ---- pure pickers (tested) ----
  function pickMeme(list, lastPick) {
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    var m = list[Math.floor(Math.random() * list.length)];
    var tries = 0;
    while (m === lastPick && tries < 10) { m = list[Math.floor(Math.random() * list.length)]; tries++; }
    return m;
  }
  function pickFromTier(list, tier, lastPick) {
    var pool = (list || []).filter(function (e) { return e.tier === tier; });
    if (!pool.length) pool = list || [];
    return pickMeme(pool, lastPick);
  }
  function roastTierFor(streakBefore, consecLosses) {
    // Broken streak (was on a 2+ correct streak) always wins -> 'streak'.
    // Otherwise escalate by consecutive losses: 1 mild, 2 harsh, 3+ brutal.
    if (streakBefore >= 2) return 'streak';
    if (consecLosses >= 3) return 'brutal';
    if (consecLosses === 2) return 'harsh';
    return 'mild';
  }
  function cheerTierFor(hadLoss, fastMs) {
    // Correct right after a loss = comeback cheer; a fast correct (< 2 s) =
    // big cheer; otherwise standard.
    if (hadLoss) return 'comeback';
    if (fastMs) return 'big';
    return 'standard';
  }
  function cryLevelFor(n) {
    // Chicken cry escalation, by CONSECUTIVE losses (wrong + timeouts in a row).
    // 1st loss: short cut (~1s). 2nd: longer (~2s). 3rd: longer + louder (~3s).
    // 4th loss and beyond: the LOUD "WAH" — the full loud cry file.
    if (n <= 0) return { capMs: 0, volume: 0, file: null };
    if (n === 1) return { capMs: 1000, volume: 0.7, file: 'audio/sfx/chicken-cry.mp3' };
    if (n === 2) return { capMs: 2000, volume: 0.85, file: 'audio/sfx/chicken-cry.mp3' };
    if (n === 3) return { capMs: 3000, volume: 1.0, file: 'audio/sfx/chicken-cry.mp3' };
    return { capMs: 6000, volume: 1.0, file: 'audio/sfx/chicken-cry-loud.mp3' };
  }
  function winErrFor(consecLosses, alreadyShown) {
    // WINDOWS ERROR trigger: 3rd consecutive wrong answer (answered, not a
    // timeout — timeouts keep their chicken), first time per session only.
    // At most once per session: it must stay a surprise, not a routine.
    return consecLosses === 3 && !alreadyShown;
  }
  function completionMusicFor(score) {
    // Result-screen music, matched to the result. Great = fanfare, mid = cheer,
    // low = the FULL pigeon song (audio/sfx/pigeon-full.mp3, 2:10 — the whole
    // "One Little Pigeon" track, by the user's explicit choice).
    if (score >= 15) return 'fanfare';
    if (score >= 10) return 'cheer';
    return 'pigeon';
  }
  function fastAnswer(elapsedMs) { return elapsedMs < 2000; } // correct in under 2s -> rainbow horse flies across
  function beat60(timeSecs) { return timeSecs < 60; }

  // ---- audio (browser only; silent no-ops without a DOM/Audio) ----
  var soundOn = true;
  var currentAudio = null;
  function stopCurrentAudio() {
    try {
      if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    } catch (e) {}
    currentAudio = null;
  }
  function tryPlayFile(path, capMs, volume) {
    // Returns a promise resolving true if the file actually played, false if missing.
    // Missing file = resolve false (NOT an error) so the game carries on.
    // capMs: stop playback after this many ms (reaction overlay is ~2.4s).
    return new Promise(function (resolve) {
      if (!soundOn || typeof Audio === 'undefined') return resolve(false);
      try {
        var a = new Audio(path);
        if (volume != null) { try { a.volume = volume; } catch (e) {} }
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
        setTimeout(function () { finish(false); }, 1200); // file never arrived: fall back
      } catch (e) { resolve(false); }
    });
  }
  function playMemeAudio(entry) {
    // MEME + SOUND RESONANCE: play ONLY this meme's paired mp3 (entry.audio).
    // A meme with audio: null plays SILENT — no generated/robot voice, ever.
    // Long clips cut at ~2.6s (the reaction overlay is ~2.4s).
    if (!entry || !entry.audio) return;
    tryPlayFile(entry.audio, 2600);
  }
  function playAirhorn() {
    // Big moments only: great finish, or a 3-correct streak. VERY LOUD AIRHORN.
    if (!soundOn) return;
    tryPlayFile('audio/sfx/airhorn-01.mp3', 3000);
  }
  function playChickenCry(level, delayMs) {
    // The chicken cry, at the escalation level for this consecutive-loss count.
    // Plays after the meme's own sound (delayMs, default 700ms), so the two do
    // not talk over each other — except on a timeout, where the cry IS the
    // meme's sound and plays at once (delayMs 0).
    if (!soundOn || !level || !level.file) return;
    setTimeout(function () { tryPlayFile(level.file, level.capMs, level.volume); }, delayMs == null ? 700 : delayMs);
  }
  function playCompletionMusic(score) {
    // Result-screen music, matched to the result (see completionMusicFor).
    // 'pigeon' = the FULL 2:10 track (audio/sfx/pigeon-full.mp3) — no cap, it
    // plays through on the result screen; leaving the screen stops it.
    if (!soundOn) return;
    var kind = completionMusicFor(score);
    if (kind === 'fanfare') {
      playAirhorn();
      tryPlayFile('audio/sfx/fanfare.mp3', 3000);
    } else if (kind === 'cheer') {
      tryPlayFile('audio/sfx/cheer.mp3', 3000);
    } else {
      tryPlayFile('audio/sfx/pigeon-full.mp3');
    }
  }

  // ---- DOM helpers (browser only) ----
  function memeEl(entry) {
    // One element for the meme: <img> for GIFs/stills, <video> for mp4s.
    if (typeof document === 'undefined' || !entry || !entry.file) return null;
    var isVideo = /\.mp4$/i.test(entry.file);
    var elx = document.createElement(isVideo ? 'video' : 'img');
    elx.className = 'reaction-meme-media';
    if (isVideo) {
      elx.src = entry.file; elx.muted = true; elx.loop = true; elx.autoplay = true; elx.playsInline = true;
    } else {
      elx.src = entry.file; elx.alt = entry.voice || '';
    }
    return elx;
  }
  function spawnSparkles(n) {
    // Rainbow sparkle trail around the flying horse: little coloured stars
    // scattered across the middle of the screen, twinkling out in ~1.5s.
    if (typeof document === 'undefined') return;
    var colours = ['#ff0000', '#ff7f00', '#ffee00', '#00e500', '#0088ff', '#7a00ff', '#ff2e88', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div');
      s.className = 'sparkle';
      s.textContent = Math.random() < 0.5 ? '✦' : '★';
      s.style.left = (5 + Math.random() * 90) + '%';
      s.style.top = (15 + Math.random() * 60) + '%';
      s.style.color = colours[i % colours.length];
      s.style.fontSize = (18 + Math.random() * 26) + 'px';
      s.style.animationDelay = (Math.random() * 0.9) + 's';
      document.body.appendChild(s);
      (function (elx) { setTimeout(function () { if (elx.parentNode) elx.parentNode.removeChild(elx); }, 1800); })(s);
    }
  }
  function flyRainbowHorse(big) {
    // THE RAINBOW HORSE: the white hamster ("Pancake") riding a cartoon unicorn
    // under a rainbow flies ACROSS the screen, right OVER the play area, with
    // rainbow sparkles around it. ~1.8s. pointer-events: none, so it can NEVER
    // block the game — the sweep passes over and is gone. Two triggers: (a) a
    // correct answer in under 2 seconds (small, big=false), (b) finishing the
    // whole session in under 60 seconds (big=true, with airhorn).
    if (typeof document === 'undefined') return;
    var M = memes();
    var layer = document.getElementById('rainbow-horse-layer');
    if (!layer || !M || !M.rainbow || !M.rainbow.length) return;
    var path = M.rainbow[Math.floor(Math.random() * M.rainbow.length)];
    var elx = document.createElement('video');
    elx.src = path; elx.muted = true; elx.loop = true; elx.autoplay = true; elx.playsInline = true;
    elx.className = 'rainbow-horse' + (big ? ' big' : '');
    layer.appendChild(elx);
    spawnSparkles(big ? 22 : 14);
    setTimeout(function () { if (elx.parentNode) elx.parentNode.removeChild(elx); }, 2000);
  }

  // ---- 2016 MLG colour flash + flying meme layer (ported from Math Roast) ----
  function flashBody(kind) {
    // Rapid hue shifts on the PAGE background only. The game card stays
    // solid white, so the play area stays readable.
    if (typeof document === 'undefined') return;
    var cls = kind === 'cheer' ? 'flash-cheer' : 'flash-roast';
    document.body.classList.remove('flash-cheer', 'flash-roast', 'flash-rainbow');
    void document.body.offsetWidth;
    document.body.classList.add(cls);
    setTimeout(function () { document.body.classList.remove(cls); }, 800);
  }
  function shakeBody() {
    // Screen shake on a wrong round (500 ms, then it stops).
    if (typeof document === 'undefined') return;
    document.body.classList.add('shake');
    setTimeout(function () { document.body.classList.remove('shake'); }, 500);
  }
  function allMemeFiles() {
    // Flying layer = reaction memes + the 2016 MLG tropes (Doritos, Mountain
    // Dew, Illuminati, FaZe, airhorn, Doge...). Entries are objects; mlg are plain paths.
    var M = memes();
    if (!M) return [];
    var files = [];
    ['cheering', 'roasting', 'noob'].forEach(function (k) {
      (M[k] || []).forEach(function (e) { if (e.file) files.push(e.file); });
    });
    return files.concat(M.mlg || []);
  }
  function makeFloater(burst) {
    var all = allMemeFiles();
    if (!all.length || typeof document === 'undefined') return;
    var layer = document.getElementById('float-layer'); if (!layer) return;
    var path = all[Math.floor(Math.random() * all.length)];
    var el = path.toLowerCase().endsWith('.gif')
      ? document.createElement('img')
      : document.createElement('video');
    if (el.tagName === 'VIDEO') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; }
    el.src = path; el.className = 'float-meme' + (burst ? ' burst' : '');
    var size = burst ? 90 + Math.random() * 90 : 60 + Math.random() * 90;
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.style.top = (5 + Math.random() * 80) + '%';
    el.style.left = burst ? (20 + Math.random() * 60) + '%' : '-15vw';
    if (!burst) {
      el.style.animationDuration = (18 + Math.random() * 26) + 's, ' + (1 + Math.random() * 2) + 's';
      el.style.animationDelay = (-Math.random() * 30) + 's, 0s';
    }
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, burst ? 1200 : 48000);
  }
  function startFloaters() {
    // Ambient MLG layer: 12 floaters at once, a fresh one every 6 s, a
    // swooper from a different angle every 2.6 s, a jump-cut pop every 4.2 s.
    // pointer-events: none everywhere — it can NEVER block a tap.
    if (typeof document === 'undefined') return;
    if (startFloaters.started) return;
    startFloaters.started = true;
    for (var i = 0; i < 12; i++) makeFloater(false);
    setInterval(function () { makeFloater(false); }, 6000);
    setInterval(function () { spawnSwooper(); }, 2600);
    setInterval(function () { spawnJumpPop(); }, 4200);
  }
  var SWOOP_DIRS = ['from-top', 'from-bottom', 'from-left', 'from-right', 'from-tl', 'from-tr', 'from-bl', 'from-br'];
  function spawnSwooper() {
    var all = allMemeFiles();
    if (!all.length || typeof document === 'undefined') return;
    var layer = document.getElementById('float-layer'); if (!layer) return;
    var path = all[Math.floor(Math.random() * all.length)];
    var el = path.toLowerCase().endsWith('.gif') ? document.createElement('img') : document.createElement('video');
    if (el.tagName === 'VIDEO') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; }
    el.src = path;
    var dir = SWOOP_DIRS[Math.floor(Math.random() * SWOOP_DIRS.length)];
    el.className = 'swooper ' + dir;
    var size = 80 + Math.random() * 90;
    el.style.width = size + 'px'; el.style.height = size + 'px';
    if (dir === 'from-left' || dir === 'from-right') el.style.top = (5 + Math.random() * 80) + '%';
    else if (dir === 'from-top' || dir === 'from-bottom') el.style.left = (5 + Math.random() * 80) + '%';
    el.style.animationDuration = (2.5 + Math.random() * 3) + 's';
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6500);
  }
  function spawnJumpPop() {
    // Jump-cut: a meme pops/zooms in at a screen EDGE (never over the middle,
    // so it can never cover the play area), holds a beat, then vanishes.
    var all = allMemeFiles();
    if (!all.length || typeof document === 'undefined') return;
    var path = all[Math.floor(Math.random() * all.length)];
    var el = path.toLowerCase().endsWith('.gif') ? document.createElement('img') : document.createElement('video');
    if (el.tagName === 'VIDEO') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; }
    el.src = path; el.className = 'jump-pop';
    var size = 110 + Math.random() * 70;
    el.style.width = size + 'px'; el.style.height = size + 'px';
    var spots = [
      { left: '2%', top: '12%' }, { left: '2%', top: '62%' },
      { right: '2%', top: '12%' }, { right: '2%', top: '62%' },
      { left: '42%', top: '2%' }, { left: '42%', bottom: '2%' }
    ];
    var spot = spots[Math.floor(Math.random() * spots.length)];
    Object.keys(spot).forEach(function (k) { el.style[k] = spot[k]; });
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }
  function memeBurst() { for (var i = 0; i < 4; i++) setTimeout(function () { makeFloater(true); }, i * 90); }

  // ---- lobby (Among Us start sound) ----
  function playAmongUsStart() {
    // The Among Us starting sound — its only home is the lobby (LET ME IN).
    if (!soundOn) return;
    tryPlayFile('audio/sfx/amongus-start.mp3', 3000);
  }

  var api = {
    pickMeme: pickMeme, pickFromTier: pickFromTier,
    roastTierFor: roastTierFor, cheerTierFor: cheerTierFor,
    cryLevelFor: cryLevelFor, winErrFor: winErrFor,
    completionMusicFor: completionMusicFor, fastAnswer: fastAnswer, beat60: beat60,
    tryPlayFile: tryPlayFile, playMemeAudio: playMemeAudio,
    playChickenCry: playChickenCry, playAirhorn: playAirhorn,
    playCompletionMusic: playCompletionMusic, stopCurrentAudio: stopCurrentAudio,
    memeEl: memeEl, flyRainbowHorse: flyRainbowHorse, spawnSparkles: spawnSparkles,
    flashBody: flashBody, shakeBody: shakeBody,
    startFloaters: startFloaters, makeFloater: makeFloater,
    spawnSwooper: spawnSwooper, spawnJumpPop: spawnJumpPop, memeBurst: memeBurst,
    playAmongUsStart: playAmongUsStart,
    setSoundOn: function (v) { soundOn = !!v; },
    isSoundOn: function () { return soundOn; }
  };
  if (typeof window !== 'undefined') window.ReflexFeel = api;
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
