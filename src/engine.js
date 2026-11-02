(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const chapters = ['prologue', 'vinyl', 'tape', 'cd', 'finale'];
  const ends = ['home', 'together', 'archive'];
  const choices = { vinyl: ['side', 'song'], tape: ['letter', 'copy'], cd: ['backup', 'catalog'] };
  const objects = {
    prologue: ['phone', 'headphones', 'box', 'note'],
    vinyl: ['sleeve', 'invitation', 'record', 'turntable'],
    tape: ['cassette', 'player', 'letter', 'list'],
    cd: ['discs', 'computer', 'player', 'catalog'], finale: ['collection', 'journal']
  };
  const vinylSteps = ['edges', 'clean', 'place', '33', 'play'];
  const vinylHints = [
    'Спочатку візьми платівку за краї: не торкайся канавок.',
    'Спершу прибери пил м’якою щіткою для платівок.',
    'Поклади платівку на диск програвача.',
    'Подивись на етикетку: тут зазначено 33⅓ об/хв.',
    'Тепер можна запустити програвач і обережно опустити тонарм.'
  ];
  function initialState(unlocked = []) {
    return { version: 1, chapter: 'prologue', phase: 'explore', step: 0, choices: {}, seen: {}, unlocked: [...new Set(unlocked.filter(x => ends.includes(x)))], ending: null, feedback: '' };
  }
  function reduce(state, action) {
    const s = JSON.parse(JSON.stringify(state));
    const value = action.value;
    switch (action.type) {
      case 'inspect':
        if (!objects[s.chapter].includes(value)) return state;
        s.seen[s.chapter] = [...new Set([...(s.seen[s.chapter] || []), value])];
        return s;
      case 'enter':
        if (s.chapter !== 'prologue') return state;
        s.chapter = 'vinyl'; s.feedback = ''; return s;
      case 'vinyl':
        if (s.chapter !== 'vinyl' || s.phase !== 'explore') return state;
        if (value !== vinylSteps[s.step]) { s.feedback = vinylHints[s.step]; return s; }
        s.step += 1; s.feedback = '';
        if (s.step === 5) s.phase = 'choice';
        return s;
      case 'tape':
        if (s.chapter !== 'tape' || s.phase !== 'explore') return state;
        if (JSON.stringify(value) !== '["road","meeting","unsaid"]') {
          s.feedback = 'Згадай, із чого все почалося: спочатку дорога, потім зустріч, а наприкінці — невисловлене.'; return s;
        }
        s.phase = 'choice'; s.feedback = ''; return s;
      case 'disc':
        if (s.chapter !== 'cd' || s.phase !== 'explore' || !Array.isArray(value)) return state;
        if ((value[0] === 'audio' && value[1] === 'player') || (value[0] === 'mp3' && value[1] === 'computer')) {
          s.phase = 'choice'; s.feedback = ''; return s;
        }
        s.feedback = value[0] === 'mp3' && value[1] === 'player'
          ? 'Цей програвач не підтримує файли MP3. Спробуй інший диск або інший пристрій.'
          : 'На цьому диску немає потрібного запису. Звір список доріжок і підтримку формату.';
        return s;
      case 'choice':
        if (s.phase !== 'choice' || !choices[s.chapter]?.includes(value)) return state;
        s.choices[s.chapter] = value; s.phase = 'loss'; s.feedback = ''; return s;
      case 'restore': {
        if (s.phase !== 'loss') return state;
        s.chapter = chapters[chapters.indexOf(s.chapter) + 1];
        s.phase = 'explore'; s.step = 0; s.feedback = ''; return s;
      }
      case 'ending':
        if (s.chapter !== 'finale' || s.phase !== 'explore' || !ends.includes(value)) return state;
        s.ending = value; s.phase = 'ended'; s.unlocked = [...new Set([...s.unlocked, value])]; return s;
      case 'backToFinale':
        if (s.phase !== 'ended') return state;
        s.phase = 'explore'; s.ending = null; return s;
      default: return state;
    }
  }
  function serialize(state) { return JSON.stringify(state); }
  function parseSave(text) {
    try {
      const s = JSON.parse(text);
      if (!s || s.version !== 1 || !chapters.includes(s.chapter)) return null;
      if (!['explore', 'choice', 'loss', 'ended'].includes(s.phase)) return null;
      if (!Number.isInteger(s.step) || s.step < 0 || s.step > 5) return null;
      if (!s.choices || typeof s.choices !== 'object' || Array.isArray(s.choices)) return null;
      for (const [k, v] of Object.entries(s.choices)) if (!choices[k]?.includes(v)) return null;
      if (!Array.isArray(s.unlocked) || s.unlocked.some(x => !ends.includes(x))) return null;
      if (!s.seen || typeof s.seen !== 'object' || Array.isArray(s.seen)) return null;
      for (const [k, v] of Object.entries(s.seen)) if (!objects[k] || !Array.isArray(v) || v.some(x => !objects[k].includes(x))) return null;
      if (typeof s.feedback !== 'string' || s.feedback.length > 2000) return null;
      if (s.ending !== null && !ends.includes(s.ending)) return null;
      const index = chapters.indexOf(s.chapter);
      for (let i = 1; i < index; i++) if (!choices[chapters[i]].includes(s.choices[chapters[i]])) return null;
      if ((s.chapter === 'prologue' || s.chapter === 'finale') && !['explore', 'ended'].includes(s.phase)) return null;
      if (s.phase === 'ended' && (s.chapter !== 'finale' || !s.ending || !s.unlocked.includes(s.ending))) return null;
      if (s.phase !== 'ended' && s.ending !== null) return null;
      if (s.phase === 'loss' && !choices[s.chapter]?.includes(s.choices[s.chapter])) return null;
      if (s.chapter === 'vinyl' && ((s.phase === 'explore' && s.step >= 5) || (s.phase !== 'explore' && s.step !== 5))) return null;
      if (s.chapter !== 'vinyl' && s.step !== 0) return null;
      return { version: 1, chapter: s.chapter, phase: s.phase, step: s.step, choices: { ...s.choices }, seen: s.seen, unlocked: [...new Set(s.unlocked)], ending: s.ending, feedback: s.feedback };
    } catch { return null; }
  }
  return { initialState, reduce, serialize, parseSave };
});
