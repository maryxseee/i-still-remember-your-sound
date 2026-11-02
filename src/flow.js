(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function split(text, limit = 260) {
    const words = String(text).split(/\s+/).filter(Boolean), chunks = [];
    let line = '';
    for (const word of words) {
      if (line && (line + ' ' + word).length > limit) { chunks.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) chunks.push(line);
    return chunks;
  }
  const beat = (speaker, text, dim = false) => split(text).map(text => ({ speaker, text, dim }));
  const guides = [
    { question: 'Як візьмеш платівку?', before: 'Почнімо з платівки. Канавки на її поверхні зберігають звук. Подумай, як узяти її, щоб не залишити слідів.', options: [['edges', 'Обережно взяти за краї'], ['surface', 'Взяти за поверхню']] },
    { question: 'На платівці є пил. Що зробиш?', before: 'Так, за краї. А тепер придивися: на поверхні залишився пил. Перш ніж слухати, підготуймо платівку.', options: [['clean', 'Прибрати пил щіткою для платівок'], ['play', 'Запустити як є']] },
    { question: 'Платівка чиста. Яка наступна дія?', before: 'Готово, пилу більше немає. Тепер треба розмістити платівку на програвачі. Голку поки не опускаємо.', options: [['place', 'Покласти платівку на диск програвача'], ['play', 'Одразу опустити голку']] },
    { question: 'Яку швидкість обереш?', before: 'Платівка на місці. На етикетці є підказка: «33⅓ об/хв». Звір її з перемикачем швидкості на програвачі.', options: [['45', '45 об/хв'], ['33', '33⅓ об/хв']] },
    { question: 'Усе підготовлено. Запустимо?', before: 'Швидкість налаштована правильно. Залишився останній рух — запустити програвач і обережно опустити тонарм.', options: [['play', 'Запустити й обережно опустити тонарм'], ['45', 'Перемкнути на іншу швидкість']] }
  ];
  function vinylGuide(step) { return guides[step] || guides[0]; }
  function key(state) { return `${state.chapter}:${state.phase}:${state.step}:${state.ending || ''}`; }
  function sequence(state, story) {
    const c = story.chapters[state.chapter];
    if (state.phase === 'ended') {
      const end = story.endings[state.ending];
      return [...beat('Твоя історія', end.text), ...beat('Твоя думка', end.quote), ...story.journal(state.choices).flatMap(n => beat(n.title, n.text))];
    }
    if (state.phase === 'loss') return [
      ...beat(c.person, c.aftermath[state.choices[state.chapter]]),
      ...beat('А якби носія не залишилося?', c.loss, true),
      ...beat('Спогад залишається', c.transition)
    ];
    if (state.phase === 'choice') return [...beat(c.person, c.success), ...beat(c.person, c.question)];
    if (state.chapter === 'vinyl' && state.step > 0) return beat('Ребекка', vinylGuide(state.step).before);
    const opening = [...beat('Історія', c.intro), ...beat(c.person, c.line)];
    if (state.chapter === 'prologue') return [...opening, ...beat('Твоя думка', 'На столі стара коробка. Оглянь її й прочитай записку. Речі можна натискати на сцені або обирати їхні назви під діалогом.')];
    if (state.chapter === 'vinyl') return [...opening, ...beat('Ребекка', 'Допоможеш мені підготувати програвач? Спочатку можна оглянути речі. Коли будеш готова, натисни «До програвача». Я буду поруч на кожному кроці.')];
    if (state.chapter === 'tape') return [...opening,
      ...beat('Джоні', 'Тут три фрагменти одного послання. Потрібно розташувати їх від першого до останнього. Лист і список композицій підкажуть, із чого все почалося.'),
      ...beat('Джоні', 'Коли відкриєш касету, пересувай картки стрілками ↑ ↓. Верхня звучить першою, нижня — останньою. Потім натисни «Перевірити порядок». Звук для розв’язання не потрібен.')];
    if (state.chapter === 'cd') return [...opening,
      ...beat('Анжела', 'Допоможи знайти запис. Спочатку оберемо один із трьох дисків, потім — пристрій. Формат диска має підходити до пристрою.'),
      ...beat('Анжела', 'Можеш спершу оглянути підписи на дисках і пристроях. Коли будеш готова, натисни «Знайти запис». Якщо не вийде — спробуємо іншу пару.')];
    return [...opening, ...beat('Твоя думка', c.task)];
  }
  function presentation(state, story) {
    const saved = state.presentation;
    const matching = saved && saved.key === key(state);
    const cursor = matching && Number.isInteger(saved.cursor) && saved.cursor >= 0 ? Math.min(saved.cursor, sequence(state, story).length) : 0;
    const activity = matching && ['explore', 'puzzle'].includes(saved.activity) ? saved.activity : state.chapter === 'vinyl' && state.step > 0 ? 'puzzle' : 'explore';
    return { key: key(state), cursor, activity, ready: cursor >= sequence(state, story).length };
  }
  function update(state, story, change) {
    const p = presentation(state, story);
    return { ...state, presentation: { key: p.key, cursor: p.cursor, activity: p.activity, ...change } };
  }
  function advance(state, story) {
    const p = presentation(state, story);
    return update(state, story, { cursor: Math.min(p.cursor + 1, sequence(state, story).length) });
  }
  function startPuzzle(state, story) {
    if (state.phase !== 'explore' || !['vinyl', 'tape', 'cd'].includes(state.chapter) || !presentation(state, story).ready) return state;
    return update(state, story, { activity: 'puzzle' });
  }
  function explore(state, story) { return update(state, story, { activity: 'explore' }); }
  return { split, key, sequence, presentation, advance, startPuzzle, explore, vinylGuide };
});
