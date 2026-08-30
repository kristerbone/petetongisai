/**
 * PeteTongIsAI.com — app.js
 *
 * Slots ready for:
 *   - ElevenLabs TTS  →  speakText()
 *   - Spotify SDK     →  mockSpotifyConnect() / togglePlay()
 */

'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  deckA: { playing: false, bpm: 128.0 },
  deckB: { playing: false, bpm: 128.0 },
  spotify: { connected: false, playing: false, progress: 35 },
  voiceOpt: 'custom',
};

// ---------------------------------------------------------------------------
// Jingle phrases
// ---------------------------------------------------------------------------

const JINGLES = {
  essential:  "Welcome to the Essential Mix. Two hours of the finest music on the planet, right here on BBC Radio One. Let's go.",
  petertong:  "My name is Pete Tong. And this… is my show.",
  gonepete:   "It has, quite literally, all gone Pete Tong.",
  ibiza:      "Ibiza! The white isle. There's nowhere like it on earth. Absolute paradise.",
  radio1:     "You're listening to BBC Radio One. I'm Pete Tong. Stay with me.",
  massive:    "This is absolutely massive. Huge. One of the biggest tunes of the year, right here.",
  feeling:    "What. A. Feeling. This is what it's all about. Right here, right now.",
  bigerror:   "Now that… that was a big error. But we move on. The music never stops.",
};

// ---------------------------------------------------------------------------
// TTS — swap speakText() body for ElevenLabs when keys are ready
// ---------------------------------------------------------------------------

const synth = window.speechSynthesis;

function speakText(text) {
  if (!synth) return;
  synth.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const british = voices.find(v => v.lang === 'en-GB') || voices[0];
  if (british) utt.voice = british;
  utt.rate   = 0.95;
  utt.pitch  = 0.85;
  utt.volume = 1.0;

  synth.speak(utt);
}

// ElevenLabs stub — replace this function body when API key is available:
// async function speakTextElevenLabs(text) {
//   const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID', {
//     method: 'POST',
//     headers: {
//       'xi-api-key': ELEVENLABS_API_KEY,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1' }),
//   });
//   const blob = await res.blob();
//   const url  = URL.createObjectURL(blob);
//   new Audio(url).play();
// }

// ---------------------------------------------------------------------------
// Jingle buttons
// ---------------------------------------------------------------------------

function playJingle(btn, key) {
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 300);
  const text = JINGLES[key];
  if (text) speakText(text);
}

// ---------------------------------------------------------------------------
// Custom voice input
// ---------------------------------------------------------------------------

function speakAsPete() {
  const text = document.getElementById('voiceText').value.trim();
  if (!text) return;
  speakText(text);

  const el = document.getElementById('lastSpoken');
  el.style.display = 'block';
  el.textContent = `🎙 "${text.length > 80 ? text.slice(0, 80) + '…' : text}"`;
}

function selectOpt(el, opt) {
  document.querySelectorAll('.voice-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  state.voiceOpt = opt;

  const input = document.getElementById('voiceText');
  const presets = {
    trackintro: 'Right, coming up next — introducing the next track as only Pete Tong can...',
    rave:       'COME ON! This place is absolutely on fire right now, are you ready?!',
    custom:     '',
  };
  input.value = presets[opt] ?? '';
}

// ---------------------------------------------------------------------------
// Turntables
// ---------------------------------------------------------------------------

function toggleDeck(deck) {
  const key = `deck${deck}`;
  state[key].playing = !state[key].playing;

  const platter = document.getElementById(`platter${deck}`);
  const label   = document.getElementById(`label${deck}`);

  if (state[key].playing) {
    platter.classList.add('spinning');
    label.innerHTML = '▶ LIVE';
    label.style.fontSize = '9px';
    updatePlatterSpeed(deck);
  } else {
    platter.classList.remove('spinning');
    label.innerHTML = 'PRESS<br>PLAY';
    label.style.fontSize = '8px';
  }
}

function nudgeBpm(deck, delta) {
  const key = `deck${deck}`;
  state[key].bpm = Math.max(60, Math.min(200, state[key].bpm + delta));
  document.getElementById(`bpm${deck}`).textContent = state[key].bpm.toFixed(1);
  if (state[key].playing) updatePlatterSpeed(deck);
}

function updatePlatterSpeed(deck) {
  const bpm = state[`deck${deck}`].bpm;
  const secondsPerBeat = 60 / bpm;
  document.getElementById(`platter${deck}`).style.animationDuration = `${secondsPerBeat}s`;
}

// ---------------------------------------------------------------------------
// EQ knobs
// ---------------------------------------------------------------------------

function rotateKnob(el) {
  const current = parseInt(el.dataset.rot ?? '180', 10);
  const next = (current + 30) % 360;
  el.dataset.rot = next;
  el.style.background = `conic-gradient(#ff6b35 0deg ${next}deg, #2a2a2a ${next}deg)`;
}

// ---------------------------------------------------------------------------
// Level meters — animated
// ---------------------------------------------------------------------------

function buildMeters() {
  ['meterA', 'meterB', 'meterMaster'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const count = id === 'meterMaster' ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const bar  = document.createElement('div');
      bar.className = 'meter-bar';
      bar.style.height = id === 'meterMaster' ? '36px' : '60px';
      const fill = document.createElement('div');
      fill.className = 'meter-fill';
      bar.appendChild(fill);
      el.appendChild(bar);
    }
  });
}

function animateMeters() {
  ['meterA', 'meterB', 'meterMaster'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const deckKey = id === 'meterA' ? 'deckA' : id === 'meterB' ? 'deckB' : null;
    const active  = deckKey ? state[deckKey].playing : (state.deckA.playing || state.deckB.playing);

    el.querySelectorAll('.meter-fill').forEach(fill => {
      const pct = active ? Math.random() * 72 + 20 : Math.random() * 4;
      fill.style.height = `${pct}%`;
      fill.style.background = pct > 80 ? '#ff3333' : pct > 60 ? '#ffaa00' : '#1db954';
    });
  });
  setTimeout(animateMeters, 110);
}

// ---------------------------------------------------------------------------
// Spotify (mock — replace with real Web Playback SDK)
// ---------------------------------------------------------------------------

function mockSpotifyConnect() {
  // TODO: replace with real Spotify OAuth + SDK init
  document.getElementById('spotifyConnect').style.display = 'none';
  document.getElementById('spotifyPlayer').classList.add('visible');
  document.getElementById('deckAtrack').textContent = 'Cafe Del Mar — Energy 52';
  buildWaveform();
  startProgressTick();
}

function buildWaveform() {
  const wf = document.getElementById('waveform');
  wf.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const bar = document.createElement('div');
    bar.className = `wave-bar${i < 21 ? ' active' : ''}`;
    bar.style.height = `${Math.random() * 24 + 6}px`;
    wf.appendChild(bar);
  }
}

let progressTimer;

function startProgressTick() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (state.spotify.playing) {
      state.spotify.progress = Math.min(100, state.spotify.progress + 0.15);
      document.getElementById('progressFill').style.width = `${state.spotify.progress}%`;
    }
  }, 500);
}

function togglePlay() {
  state.spotify.playing = !state.spotify.playing;
  document.getElementById('playBtn').textContent = state.spotify.playing ? '⏸' : '▶';
}

function seekTrack(e, el) {
  const pct = ((e.clientX - el.getBoundingClientRect().left) / el.offsetWidth) * 100;
  state.spotify.progress = Math.max(0, Math.min(100, pct));
  document.getElementById('progressFill').style.width = `${state.spotify.progress}%`;
}

function prevTrack() { state.spotify.progress = 0; document.getElementById('progressFill').style.width = '0%'; }
function nextTrack() { prevTrack(); }

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  buildMeters();
  animateMeters();
  // Trigger voice list load on browsers that require it
  if (synth) synth.getVoices();
});
