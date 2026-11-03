(function () {
  'use strict';
  let context, ambience, master;
  const settings = { music: 0.5, effects: 0.4, muted: false };
  const tracks = {}; // Add only cleared local recordings: chapter: 'assets/audio/filename.mp3'.
  let currentTrack = null, activeChapter = null, musicIssue = false;
  function unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!context) { context = new Audio(); master = context.createGain(); master.connect(context.destination); }
      context.resume().catch(() => {});
      apply();
    } catch { /* A text-complete game remains playable without audio. */ }
  }
  function apply() {
    if (master && context) master.gain.setTargetAtTime(settings.muted ? 0 : settings.effects, context.currentTime, 0.05);
    if (currentTrack) currentTrack.volume = settings.muted ? 0 : settings.music;
    window.GameMusic?.apply();
  }
  function effect(kind = 'click') {
    if (!context || context.state !== 'running' || settings.muted) return;
    const duration = kind === 'rewind' ? 0.55 : kind === 'paper' ? 0.25 : 0.09;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / samples.length * 7);
    const source = context.createBufferSource(); source.buffer = buffer;
    const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = kind === 'paper' ? 1700 : kind === 'rewind' ? 800 : 350;
    const gain = context.createGain(); gain.gain.value = kind === 'paper' ? 0.17 : 0.3;
    source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function stop() {
    if (ambience) { try { ambience.stop(); } catch {} ambience.disconnect(); ambience = null; }
    if (currentTrack) { currentTrack.pause(); currentTrack = null; }
    activeChapter = null;
  }
  function scene(chapter, playing, lost) {
    const key = `${chapter}:${playing}:${lost}`;
    if (key === activeChapter) return;
    stop(); activeChapter = key; musicIssue = false;
    if (!context || lost) return;
    const seconds = 2;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.005;
    ambience = context.createBufferSource(); ambience.buffer = buffer; ambience.loop = true; ambience.connect(master); ambience.start();
    if (playing && tracks[chapter]) {
      currentTrack = new window.Audio(tracks[chapter]);
      currentTrack.loop = true; apply();
      currentTrack.onerror = () => { musicIssue = true; document.dispatchEvent(new Event('music-unavailable')); };
      currentTrack.play().catch(() => { musicIssue = true; document.dispatchEvent(new Event('music-unavailable')); });
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (context) context.suspend().catch(() => {}); if (currentTrack) currentTrack.pause(); }
    else { if (context) context.resume().catch(() => {}); if (currentTrack) currentTrack.play().catch(() => {}); }
  });
  window.GameAudio = { unlock, effect, scene, stop, settings, apply, hasTrack: chapter => Boolean(tracks[chapter]) && !musicIssue };
})();
