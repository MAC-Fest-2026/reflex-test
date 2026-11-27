// Reflex Test — meme index. FREAKY FEEL, CALM UI.
// ============================================================================
// CHANGE A PAIRING HERE — ONE LINE PER MEME.
// Every reaction meme is ONE entry: { file, voice, audio [, tier] [, chicken] }.
//   file  = the meme image (Tenor GIF) or video (mp4). GIFs animate silently;
//           the sound comes from `audio`.
//   voice = the short line shown under the meme for THAT meme's feeling.
//           A cheer meme only ever gets its cheer voice, a roast meme only
//           its roast voice, NOOB only NOOB. Never pair a random voice with
//           a random meme. Every voice roasts the SCORE, never the person —
//           school-safe, no racist content, no slurs, no attacks on any group.
//   audio = the ONE MyInstants mp3 that matches THAT meme (1-to-1 pairing).
//           When the meme shows, ONLY its paired sound plays — never a random
//           sound from the same category. Only the meme choice is random.
//           audio = null -> the meme plays SILENT. No generated/robot voice,
//           ever — entry.voice is only shown as text on screen. (No TTS in
//           reactions or gameplay; SpeechSynthesis exists ONLY for the
//           instruction-screen narration in game.js, by the user's explicit
//           choice.)
// tier  = contextual roast/cheer tier, picked by feel.js. Roast: mild |
//         harsh | brutal | streak. Cheer: standard | comeback | big. A meme
//         keeps its ONE paired mp3 whatever its tier — tiers only choose
//         WHICH meme shows, never which sound.
// timeout = 7-entry pool, shown ONLY when the timer runs out: the crying
//           chicken (with its escalating cry) + 6 new reactions, each with
//           its own paired mp3. A timeout picks one at random.
// SpongeBob cap (user rule): max 5 SpongeBob memes total. Current count is
// exactly 5: cheer-04, cheer-05, roast-12, noob-05, noob-06. Do not add more.
// Sources: Tenor GIFs + MyInstants mp3s — NEVER Facebook.
// Shared trigger assets (same as Math Roast, not memes): the crying chicken
// video, the rainbow horse videos, the Windows error video, airhorn /
// chicken cries / XP ding in audio/sfx/.
const MEMES = {
  "cheering": [
    { "file": "memes/cheering/cheer-01.gif", "voice": "The cat is dancing. Your hands did that.", "audio": "memes/cheering/cheer-01.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-02.gif", "voice": "The whole Minion crowd is cheering your reflexes!", "audio": "memes/cheering/cheer-02.mp3", "tier": "big" },
    { "file": "memes/cheering/cheer-03.gif", "voice": "Pikachu says: quick hands!", "audio": "memes/cheering/cheer-03.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-04.gif", "voice": "SpongeBob is dancing. You earned it.", "audio": "memes/cheering/cheer-04.mp3", "tier": "big" },
    { "file": "memes/cheering/cheer-05.gif", "voice": "Patrick is cheering for you. Yes, Patrick.", "audio": "memes/cheering/cheer-05.mp3", "tier": "comeback" },
    { "file": "memes/cheering/cheer-06.gif", "voice": "Woohoo! Homer approves of those hands!", "audio": "memes/cheering/cheer-06.mp3", "tier": "comeback" },
    { "file": "memes/cheering/cheer-07.gif", "voice": "The baby is laughing WITH you — quick hands!", "audio": "memes/cheering/cheer-07.mp3", "tier": "comeback" },
    { "file": "memes/cheering/cheer-08.gif", "voice": "That dog is dancing because your finger was faster.", "audio": "memes/cheering/cheer-08.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-09.gif", "voice": "Confetti! You actually got it!", "audio": "memes/cheering/cheer-09.mp3", "tier": "big" },
    { "file": "memes/cheering/cheer-10.gif", "voice": "SIUUU! Ronaldo would be proud of that tap.", "audio": "memes/cheering/cheer-10.mp3", "tier": "big" },
    { "file": "memes/cheering/cheer-11.gif", "voice": "Mr Bean gives you a thumbs up. Rare.", "audio": "memes/cheering/cheer-11.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-12.gif", "voice": "Thumbs up from Iron Man himself. Nice.", "audio": "memes/cheering/cheer-12.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-13.gif", "voice": "Kermit is cheering. Yes, really.", "audio": "memes/cheering/cheer-13.mp3", "tier": "comeback" },
    { "file": "memes/cheering/cheer-14.gif", "voice": "The hamster is dancing. Your reflexes did that.", "audio": "memes/cheering/cheer-14.mp3", "tier": "comeback" },
    { "file": "memes/cheering/cheer-15.gif", "voice": "Snoop is dancing — you won that one!", "audio": "memes/cheering/cheer-15.mp3", "tier": "standard" },
    { "file": "memes/cheering/cheer-16.gif", "voice": "Cheers! Leo is toasting your fast hands!", "audio": "memes/cheering/cheer-16.mp3", "tier": "standard" }
  ],
  "roasting": [
    { "file": "memes/roasting/roast-01.gif", "voice": "Picard facepalmed. That was that bad.", "audio": "memes/roasting/roast-01.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-02.gif", "voice": "No! Michael Scott says no!", "audio": "memes/roasting/roast-02.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-03.gif", "voice": "Grumpy Cat is not impressed. At all.", "audio": "memes/roasting/roast-03.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-04.gif", "voice": "D'oh! Homer facepalmed for you.", "audio": "memes/roasting/roast-04.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-05.gif", "voice": "Mr Bean is SHOCKED. So is everyone.", "audio": "memes/roasting/roast-05.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-06.gif", "voice": "That cat is judging your score. Hard.", "audio": "memes/roasting/roast-06.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-07.gif", "voice": "That side-eye is for your score.", "audio": "memes/roasting/roast-07.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-08.gif", "voice": "Bruh. That round just happened.", "audio": "memes/roasting/roast-08.mp3", "tier": "mild" },
    { "file": "memes/roasting/roast-09.gif", "voice": "Ramsay is judging that round. Harshly.", "audio": "memes/roasting/roast-09.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-10.gif", "voice": "Kermit is done with you.", "audio": "memes/roasting/roast-10.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-11.gif", "voice": "Snoop just looked at that round like... really?", "audio": "memes/roasting/roast-11.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-12.gif", "voice": "Oh, you thought that was right? Mocking SpongeBob disagrees.", "audio": "memes/roasting/roast-12.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-13.gif", "voice": "Deal with it. Thug life chose that round.", "audio": "memes/roasting/roast-13.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-14.gif", "voice": "Speed is BARKING at your round.", "audio": "memes/roasting/roast-14.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-15.gif", "voice": "Tyler is disappointed. Your score did that.", "audio": "memes/roasting/roast-15.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-16.gif", "voice": "Even the dog is judging that round.", "audio": "memes/roasting/roast-16.mp3", "tier": "harsh" },
    { "file": "memes/roasting/roast-17.gif", "voice": "What are you doing? Idiot sandwich!", "audio": "memes/roasting/roast-17.mp3", "tier": "brutal" },
    { "file": "memes/roasting/roast-18.gif", "voice": "Emotional damage! Doge is crying for you.", "audio": "memes/roasting/roast-18.mp3", "tier": "brutal" },
    { "file": "memes/roasting/roast-19.gif", "voice": "Bomboclat! That round was NOT it.", "audio": "memes/roasting/roast-19.mp3", "tier": "brutal" },
    { "file": "memes/roasting/roast-20.gif", "voice": "MUHAHAHA. The cat is laughing at your score.", "audio": "memes/roasting/roast-20.mp3", "tier": "brutal" },
    { "file": "memes/roasting/roast-21.gif", "voice": "World's smallest violin, playing just for that round.", "audio": "memes/roasting/roast-21.mp3", "tier": "streak" },
    { "file": "memes/roasting/roast-22.gif", "voice": "Kurt Angle is just... staring. Say nothing.", "audio": "memes/roasting/roast-22.mp3", "tier": "streak" },
    { "file": "memes/roasting/roast-23.gif", "voice": "Sike! That's the wrong one!", "audio": "memes/roasting/roast-23.mp3", "tier": "streak" },
    { "file": "memes/roasting/roast-24.gif", "voice": "Doakes is watching. He knows. He always knows.", "audio": "memes/roasting/roast-24.mp3", "tier": "streak" }
  ],
  "noob": [
    { "file": "memes/roasting/noob-01.gif", "voice": "Noob! That cat fell harder than your score.", "audio": "memes/roasting/noob-01.mp3" },
    { "file": "memes/roasting/noob-02.gif", "voice": "Noob! Even Doge is walking away from that one.", "audio": "memes/roasting/noob-02.mp3" },
    { "file": "memes/roasting/noob-03.gif", "voice": "Noob! Still lost, I see.", "audio": "memes/roasting/noob-03.mp3" },
    { "file": "memes/roasting/noob-04.gif", "voice": "Noob! You tried. You failed. Classic.", "audio": "memes/roasting/noob-04.mp3" },
    { "file": "memes/roasting/noob-05.gif", "voice": "Noob! Even SpongeBob is tired of watching.", "audio": "memes/roasting/noob-05.mp3" },
    { "file": "memes/roasting/noob-06.gif", "voice": "Noob! SpongeBob is heading out. So is your score.", "audio": "memes/roasting/noob-06.mp3" }
  ],
  "timeout": [
    { "file": "memes/timeout/chicken-tree.mp4", "voice": "Time's up! The chicken on the tree is crying for you.", "audio": "audio/sfx/chicken-cry.mp3", "chicken": true },
    { "file": "memes/timeout/timeout-01.gif", "voice": "Homer's sad trombone. Time ran out.", "audio": "memes/timeout/timeout-01.mp3" },
    { "file": "memes/timeout/timeout-02.gif", "voice": "The sad cat is crying into its bowl. Time's up.", "audio": "memes/timeout/timeout-02.mp3" },
    { "file": "memes/timeout/timeout-03.gif", "voice": "Bernie Mac shakes his head. Bruh.", "audio": "memes/timeout/timeout-03.mp3" },
    { "file": "memes/timeout/timeout-04.gif", "voice": "MISSION FAILED! Time ran out.", "audio": "memes/timeout/timeout-04.mp3" },
    { "file": "memes/timeout/timeout-05.gif", "voice": "Game over. The robot face-planted. Time's up.", "audio": "memes/timeout/timeout-05.mp3" },
    { "file": "memes/timeout/timeout-06.gif", "voice": "The dog waited. You never clicked.", "audio": "memes/timeout/timeout-06.mp3" }
  ],
  // winError = the fake Windows error screen, shown ONLY on the 3rd consecutive
  // wrong answer (answered, not a timeout), first time per session — a surprise
  // roast, NOT part of the normal roast pool. Paired with the XP error ding.
  "winError": [
    { "file": "memes/roasting/win-error.mp4", "voice": "Error: Brain not found. Please restart your brain and try again.", "audio": "audio/sfx/windows-xp-error.mp3" }
  ],
  "rainbow": [
    "memes/rainbow/rainbow-horse-01.mp4",
    "memes/rainbow/rainbow-horse-02.mp4"
  ]
};
if (typeof window !== 'undefined') window.MEMES = MEMES;
if (typeof module !== 'undefined') module.exports = MEMES;
