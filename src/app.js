(function () {
  'use strict';
  const E = window.GameEngine, S = window.GameStory, A = window.GameAudio, F = window.GameFlow, V = window.GameVisual;
  const main = document.querySelector('#main'), modal = document.querySelector('#modal'), interaction = document.querySelector('#interaction-modal');
  const SAVE = 'isrys.save.v1', ENDS = 'isrys.endings.v1', SETTINGS = 'isrys.settings.v1';
  let storageWorks = true, saveWarning = '', mode = 'menu', opener = null;
  let tapeOrder = ['meeting', 'unsaid', 'road'], disc = 'other', device = 'player', dragging = null;
  let inspection = null, discStage = 'disc', textSize = 'standard';
  let visualEvent = '', inspectedObject = '';
  let visualContext = {};
  let interactionKind = null, interactionComplete = false, renderingInteraction = false, lastSpeaker = null, transitionTimer;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function read(key) { try { return localStorage.getItem(key); } catch { storageWorks = false; return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); return true; } catch { storageWorks = false; return false; } }
  function loadEnds() { try { const v = JSON.parse(read(ENDS)); return Array.isArray(v) ? v.filter(x => Object.hasOwn(S.endings, x)) : []; } catch { return []; } }
  let unlocked = loadEnds();
  const raw = read(SAVE);
  let saved = raw ? E.parseSave(raw) : null;
  if (raw && !saved) saveWarning = 'Збереження не вдалося прочитати. Можна почати нову історію або імпортувати іншу копію.';
  if (saved) unlocked = [...new Set([...unlocked, ...saved.unlocked])];
  let state = saved || E.initialState(unlocked);
  try {
    const prefs = JSON.parse(read(SETTINGS));
    if (prefs && typeof prefs === 'object') {
      for (const key of ['music', 'effects']) if (typeof prefs[key] === 'number' && Number.isFinite(prefs[key])) A.settings[key] = Math.max(0, Math.min(1, prefs[key]));
      A.settings.muted = prefs.muted === true;
      if (typeof prefs.motion === 'boolean') reducedMotion = prefs.motion;
      if (prefs.textSize === 'large') textSize = 'large';
    }
  } catch { /* Default preferences are sufficient. */ }
  document.body.classList.toggle('reduce-motion', reducedMotion);
  document.body.dataset.textSize = textSize;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, value = '', cls = '') => `<button class="${cls}" data-action="${action}" data-value="${esc(value)}">${label}</button>`;
  const icon = type => type === 'vinyl' ? '◎' : type === 'tape' ? '▣' : '◉';
  const chapters = ['prologue', 'vinyl', 'tape', 'cd', 'finale'];
  function announce(text) { document.querySelector('#announcement').textContent = text; }
  function status() {
    document.querySelector('#save-status').textContent = storageWorks
      ? (saved ? 'Прогрес збережено на цьому пристрої' : 'Три носії. Три історії. Один вечір.')
      : 'Автозбереження недоступне — збережи файл у налаштуваннях';
  }
  function persist() {
    state.unlocked = [...new Set([...unlocked, ...state.unlocked])];
    unlocked = state.unlocked;
    saved = JSON.parse(E.serialize(state));
    write(SAVE, E.serialize(state)); write(ENDS, JSON.stringify(unlocked)); status();
  }
  function dispatch(type, value) {
    const previous = state;
    const focused = document.activeElement;
    const focusedAction = focused?.dataset?.action;
    const focusedValue = focused?.dataset?.value;
    state = E.reduce(state, { type, value });
    if (state === previous) return;
    if (interactionKind === 'puzzle' && previous.phase === 'explore' && state.phase === 'choice') interactionComplete = true;
    if (previous.chapter !== state.chapter) { interactionKind = null; interactionComplete = false; }
    if (previous.chapter !== state.chapter) inspectedObject = '';
    visualEvent = type === 'vinyl' && state.step > previous.step ? ({ edges:'lift', clean:'clean', place:'place', '33':'speed', play:'play' }[value] || '') : type === 'disc' && state.phase === 'choice' ? 'disc-play' : state.feedback ? 'error' : '';
    inspection = null;
    persist(); renderGame();
    runTransition(V.transitionKind(previous,state));
    if (state.feedback || previous.chapter !== state.chapter || previous.phase !== state.phase || previous.step !== state.step) focusDialogue();
    if (previous.chapter === state.chapter && previous.phase === state.phase && focusedAction) {
      const surface=activeSurface();
      const replacement = [...surface.querySelectorAll('[data-action]')].find(node => node.dataset.action === focusedAction && node.dataset.value === focusedValue);
      if (!state.feedback) (replacement || surface.querySelector('.dialogue-next, .puzzle button:not(:disabled)'))?.focus();
    }
  }
  function focusDialogue(reveal = false) {
    const text = interaction.open ? document.querySelector('#interaction-text') : document.querySelector('#dialogue-text');
    if (text) { text.focus({preventScroll: !reveal}); announce(text.textContent); }
    else activeSurface().querySelector('.story-panel button, [data-action]')?.focus();
  }
  function activeSurface() { return interaction.open ? interaction : main; }
  function runTransition(kind) {
    if(kind==='none')return;
    clearTimeout(transitionTimer);
    const overlay=document.querySelector('#scene-transition');
    overlay.className='scene-transition';
    void overlay.offsetWidth;
    overlay.classList.add(reducedMotion?'soft-transition':`transition-${kind}`);
    const picture=main.querySelector('.scene-image');
    if(kind==='memory'&&!reducedMotion)picture?.classList.add('memory-arrival');
    transitionTimer=setTimeout(()=>{overlay.className='scene-transition';picture?.classList.remove('memory-arrival');},reducedMotion?360:1000);
  }
  function syncInteraction(c,view,beats) {
    if(!interactionKind) { if(interaction.open)interaction.close();document.querySelector('#interaction-content').innerHTML=''; return; }
    const labels={prologue:'Коробка зі спогадами',vinyl:'Підготуй програвач',tape:'Касетне послання',cd:'Знайди сумісний запис'};
    document.querySelector('#interaction-title').textContent=inspection?inspection.speaker:(labels[state.chapter]||'Взаємодія');
    renderingInteraction=true;
    const mood=V.heroineMood(state);
    const reaction=`<div class="hero-reaction" data-mood="${mood}"><span class="speaker-avatar"><img src="assets/characters/${V.characterFile('heroine',state)}" alt="Героїня: ${{neutral:'зосереджена',sad:'засмучена після помилки',happy:'радіє успіху'}[mood]}"></span><span>${mood==='sad'?'Спробуємо ще раз':mood==='happy'?'Вийшло!':'Твоя дія'}</span></div>`;
    document.querySelector('#interaction-content').innerHTML=reaction+(interactionComplete&&!inspection
      ?speech(c.person,c.success,btn('Готово — повернутися до історії','complete-interaction','','primary dialogue-next'))
      :panel(c,view,beats,true));
    renderingInteraction=false;
    if(!interaction.open)interaction.showModal();
  }
  function closeInteraction() {
    const id=inspection?.returnId;
    if(interactionComplete&&state.phase==='choice') { state=F.advance(state,S); persist(); }
    interactionKind=null;interactionComplete=false;inspection=null;inspectedObject='';
    if(interaction.open)interaction.close();
    renderGame();
    const target=id?main.querySelector(`[data-object="${id}"]`):main.querySelector('[data-action="open-interaction"]');
    if(target)target.focus();else focusDialogue();
  }
  interaction.addEventListener('cancel',e=>{e.preventDefault();if(inspection&&interactionKind==='puzzle')finishInspection();else closeInteraction();});
  function advanceDialogue() {
    state = F.advance(state, S); persist(); renderGame(); focusDialogue();
  }
  function inspectText(speaker, text, returnId = '') {
    inspection = { speaker, lines: F.split(text), cursor: 0, returnId };
    if(!interactionKind)interactionKind='inspection';
    A.effect('paper'); renderGame(); focusDialogue(true);
  }
  function finishInspection() {
    if(interactionKind==='inspection')return closeInteraction();
    const id = inspection?.returnId;
    inspection = null; renderGame();
    const object = id ? activeSurface().querySelector(`[data-object="${id}"]`) : null;
    if (object) object.focus(); else focusDialogue();
  }
  function openModal(title, html, kicker = 'ЗАПИС', returnTo) {
    opener = returnTo || document.activeElement;
    document.querySelector('#modal-title').textContent = title;
    document.querySelector('#modal-kicker').textContent = kicker;
    document.querySelector('#modal-content').innerHTML = html;
    if (!modal.open) modal.showModal();
    document.querySelector('#close-modal').focus();
  }
  function closeModal() { modal.close(); }
  modal.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); else document.querySelector('#scene-heading, #menu-heading')?.focus(); });
  document.querySelector('#close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  function renderMenu() {
    interactionKind=null;interactionComplete=false;if(interaction.open)interaction.close();
    document.querySelector('#interaction-content').innerHTML='';
    mode = 'menu'; inspection = null; A.stop(); document.body.dataset.chapter = 'prologue';
    main.innerHTML = `<section class="menu-hero"><img class="scene-image" src="assets/scenes/prologue.png" alt="Вечірня кімната: на освітленому лампою столі коробка з платівкою, касетою й CD, навушники та телефон."><div class="hero-shade"></div><img class="menu-character" src="assets/characters/heroine.png" alt="Головна героїня: золотаві кучері, веснянки, зіпка й беггі-джинси"><div class="menu-copy"><p class="eyebrow">ПРО МУЗИКУ, ЯКА ЗАЛИШАЄТЬСЯ</p><h1 id="menu-heading" tabindex="-1">I still remember<br><em>your sound</em><span class="title-period">.</span></h1><p class="menu-description">Іноді, щоб знову почути музику,<br>потрібно відкрити стару коробку.</p><div class="menu-actions">${btn('Почати історію <span aria-hidden="true">→</span>', 'new', '', 'primary')}${saved ? btn('Продовжити <span aria-hidden="true">↗</span>', 'continue', '', 'secondary') : ''}</div><div class="menu-links">${btn(`Відкриті фінали <span class="count">${unlocked.length}/3</span>`, 'endings', '', 'text-button')}${btn('Про проєкт', 'about', '', 'text-button')}</div>${saveWarning ? `<p class="notice">${esc(saveWarning)}</p>` : ''}<p class="menu-meta">10–15 ХВИЛИН <span>·</span> МИША АБО КЛАВІАТУРА <span>·</span> МОЖНА БЕЗ ЗВУКУ</p></div><div class="hero-caption"><span class="tiny-disc" aria-hidden="true"></span><span>Деякі спогади<br>мають власне звучання.</span></div></section><div class="chapter-preview"><span class="eyebrow">УСЕРЕДИНІ КОРОБКИ</span><span><b>01</b> Платівка <i>кінець 1970-х</i></span><span><b>02</b> Касета <i>1990-ті</i></span><span><b>03</b> Компакт-диск <i>початок 2000-х</i></span></div>`;
    status();
  }
  function gameMedia(chapter) { return chapter === 'finale' ? 'prologue' : chapter; }
  function musicStatus() {
    const node = document.querySelector('#music-note');
    if (node) node.textContent = A.hasTrack(state.chapter) ? 'Музика з локального запису' : 'Музичний запис ще добирається. Доступні механічні ефекти й текстові описи.';
  }
  function renderGame() {
    mode = 'game'; const c = S.chapters[state.chapter];
    const view = F.presentation(state, S), beats = F.sequence(state, S);
    const loss = state.phase === 'loss' && !view.ready && beats[view.cursor].dim, ended = state.phase === 'ended';
    const explorable = state.phase === 'explore' && view.ready && view.activity === 'explore' && !inspection && !state.feedback;
    const currentSpeaker = inspection ? 'Твоя думка' : state.feedback ? c.person : !view.ready ? beats[view.cursor].speaker : c.person;
    const currentId=V.speakerCharacter(currentSpeaker);
    visualContext = {speaker:currentSpeaker,speakerChanged:currentId!==lastSpeaker,lost:loss,event:visualEvent,order:tapeOrder,disc,device,discStage,inspected:inspection?.returnId||inspectedObject,inspectionLabel:c.objects.find(o=>o.id===(inspection?.returnId||inspectedObject))?.label};
    lastSpeaker=currentId;
    document.body.dataset.chapter = state.chapter;
    main.innerHTML = `<section class="game"><div class="scene-top"><div><p class="eyebrow">${c.number}</p><h1 id="scene-heading" tabindex="-1">${esc(ended ? S.endings[state.ending].title : c.title)}</h1><p class="era">${c.era}</p></div><ol class="timeline" aria-label="Розділи історії">${chapters.map((key, i) => `<li class="${key === state.chapter ? 'current' : chapters.indexOf(state.chapter) > i ? 'done' : ''}" ${key === state.chapter ? 'aria-current="step"' : ''}><span>${i === 0 ? '○' : i === 4 ? '✧' : '0' + i}</span><span class="sr-only">${S.chapters[key].title}</span></li>`).join('')}</ol></div><div class="scene-layout"><div class="scene-window ${loss ? 'loss' : ''}"><img class="scene-image" src="assets/scenes/${gameMedia(state.chapter)}.png" alt="${esc(c.era)} — мальована локація з предметами історії."><div class="scene-vignette"></div>${V.render(state,visualContext)}${explorable ? `<div class="hotspots" aria-label="Предмети у кімнаті">${c.objects.map(o => `<button data-object="${o.id}" class="hotspot ${(state.seen[state.chapter] || []).includes(o.id) ? 'seen' : ''}" style="--x:${o.x}%;--y:${o.y}%" aria-label="Оглянути: ${esc(o.label)}"><span aria-hidden="true">${(state.seen[state.chapter] || []).includes(o.id) ? '✓' : '+'}</span><span class="hotspot-label">${esc(o.label)}</span></button>`).join('')}</div>` : ''}<div class="scene-caption"><span class="sound-dot" aria-hidden="true"></span>${loss ? 'Якби носія не залишилося' : ended ? 'Твоя історія триває' : explorable ? 'Обери предмет на сцені або під діалогом.' : c.era}</div></div><aside class="story-panel" aria-label="Історія та дії">${panel(c, view, beats)}</aside></div>${explorable ? `<section class="object-shelf" aria-label="Огляд предметів"><span class="eyebrow">ОГЛЯНУТИ РЕЧІ</span><div>${c.objects.map(o => `<button data-object="${o.id}" class="object-button"><span aria-hidden="true">${(state.seen[state.chapter] || []).includes(o.id) ? '✓' : '+'}</span>${esc(o.label)}</button>`).join('')}</div><span class="discovered">${(state.seen[state.chapter] || []).length}/${c.objects.length} оглянуто</span></section>` : ''}<p class="audio-note" id="music-note"></p></section>`;
    A.scene(state.chapter, state.phase === 'choice', loss); musicStatus(); status();
    syncInteraction(c,view,beats);
    wireDrag();
    visualEvent = '';
  }
  function speech(speaker, text, controls, meta = '') {
    const v=V.describe(state,visualContext);
    const device=renderingInteraction?`<div class="inline-mechanism ${v.error?'device-error':''} ${v.lost?'medium-lost':''} action-${visualContext.event}" data-record="${v.record}" data-speed="${v.speed}" data-spinning="${v.spinning}" data-box-open="${v.boxOpen}">${V.mechanism(state,visualContext)}</div>`:'';
    return `<div class="dialogue-heading"><div class="speaker-identity">${V.avatar(speaker,state)}<p class="speaker">${esc(speaker)}</p></div>${meta ? `<span class="dialogue-progress">${esc(meta)}</span>` : ''}</div><div class="dialogue-body ${device?'with-device':''}"><p id="${renderingInteraction?'interaction-text':'dialogue-text'}" class="dialogue-text" tabindex="-1">${esc(text)}</p>${device}</div><div class="dialogue-controls">${controls}</div>`;
  }
  function panel(c, view, beats, insideInteraction=false) {
    if(!insideInteraction&&inspection)return speech('Твоя думка','Роздивімося цю річ ближче.',btn('Повернутися до огляду','open-interaction','','primary'));
    if(!insideInteraction&&state.phase==='explore'&&view.activity==='puzzle')return speech(c.person,'Завдання можна продовжити в окремому вікні. Твій поточний крок збережено.',btn('Повернутися до завдання','open-interaction','','primary'));
    if (inspection) {
      const last = inspection.cursor === inspection.lines.length - 1;
      return speech(inspection.speaker, inspection.lines[inspection.cursor], btn(last ? 'Повернутися до сцени' : 'Далі →', 'inspection-next', '', 'primary dialogue-next'), `${inspection.cursor + 1} / ${inspection.lines.length}`);
    }
    if (state.feedback) return speech(c.person, state.feedback, btn('Спробувати ще раз', 'retry', '', 'primary dialogue-next'), 'Нічого страшного — можна повторити');
    if (!view.ready) {
      const beat = beats[view.cursor];
      const last = view.cursor === beats.length - 1;
      const label = !last ? 'Далі →' : state.phase === 'choice' || state.chapter === 'finale' ? 'До вибору →' : state.phase === 'ended' ? 'Завершити епілог →' : state.phase === 'loss' ? 'Продовжити →' : view.activity === 'puzzle' ? 'Спробувати →' : 'Оглянути кімнату →';
      return speech(beat.speaker, beat.text, `${view.cursor ? btn('← Назад', 'previous-line', '', 'text-button') : ''}${btn(label, 'next-line', '', 'primary dialogue-next')}`, `${view.cursor + 1} / ${beats.length}`);
    }
    if (state.phase === 'ended') {
      const end = S.endings[state.ending];
      return speech(end.title, `Фінал відкрито. У твоїй колекції ${unlocked.length} з 3 завершень. Можна повернутися до останнього вибору й побачити іншу історію.`, `${btn('Повернутися до фінального вибору', 'backToFinale', '', 'primary')}${btn('Титри й матеріали', 'credits', '', 'secondary')}${btn('Відкриті фінали', 'endings', '', 'text-button')}${btn('Почати знову', 'new', '', 'text-button')}`);
    }
    if (state.phase === 'loss') return speech('Спогад збережено', 'Ця історія залишиться з тобою. Можна відкрити наступний спогад.', btn('До наступного спогаду →', 'restore', '', 'primary dialogue-next'));
    if (state.chapter === 'finale') return speech(c.person, 'Що ти хочеш зробити з цією колекцією?', `<div class="choices">${Object.entries(S.endings).map(([key, v]) => btn(`<b>${v.title}</b><small>${v.label}</small><span aria-hidden="true">↗</span>`, 'ending', key, 'choice-button')).join('')}</div>${btn('Переглянути свої рішення', 'journal', '', 'text-button')}`);
    if (state.phase === 'choice') return speech(c.person, c.question, `<div class="choices">${c.options.map(([key, label, sub]) => btn(`<b>${label}</b><small>${sub}</small><span aria-hidden="true">↗</span>`, 'choice', key, 'choice-button')).join('')}</div>`);
    if (view.activity === 'explore') {
      const labels = { vinyl: 'До програвача →', tape: 'Відкрити касетне послання →', cd: 'Знайти запис →' };
      return speech(c.person, state.chapter === 'prologue' ? 'У коробці три носії. Оглянь їх і записку. Коли будеш готова, почни зі сторони А.' : 'Можна придивитися до предметів і прочитати записки. Або почати завдання — я поясню кожний крок.', `${state.chapter === 'prologue' ? btn('Почати зі сторони А →', 'enter', '', 'primary') : btn(labels[state.chapter], 'start-puzzle', '', 'primary')}${btn('Підказка', 'hint', '', 'text-button')}`);
    }
    return puzzle();
  }
  function puzzle() {
    if (state.chapter === 'vinyl') {
      const guide = F.vinylGuide(state.step);
      return speech('Ребекка', guide.question, `<div class="puzzle vinyl-puzzle"><div class="step-track" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<span class="${i < state.step ? 'complete' : ''}"></span>`).join('')}</div><div class="puzzle-options">${guide.options.map(([v, text]) => btn(text, 'vinyl', v, 'option')).join('')}</div></div>${puzzleHelp()}`, `Крок ${state.step + 1} з 5`);
    }
    if (state.chapter === 'tape') return speech('Джоні', 'Розташуй фрагменти послання: початок угорі, завершення внизу. Пересувай картки стрілками ↑ ↓.', `<div class="puzzle"><ol class="tape-cards">${tapeOrder.map((id, i) => `<li draggable="true" data-fragment="${id}"><span class="fragment-number">${['Початок', 'Середина', 'Кінець'][i]}</span><div><b>${S.fragments[id].name}</b><small>${S.fragments[id].description}</small></div><div class="move-buttons"><button data-move="${i}" data-direction="-1" aria-label="Перемістити ${S.fragments[id].name} вгору" ${i === 0 ? 'disabled' : ''}>↑</button><button data-move="${i}" data-direction="1" aria-label="Перемістити ${S.fragments[id].name} вниз" ${i === 2 ? 'disabled' : ''}>↓</button></div></li>`).join('')}</ol>${btn('Перевірити порядок', 'check-tape', '', 'primary')}${btn('Прочитати записку Джоні', 'hint', '', 'secondary')}</div>${puzzleHelp()}`);
    if (discStage === 'disc') return speech('Анжела', 'Який диск перевіримо? Поглянь на формат і список записів.', `<div class="choices disc-options">${[['other','Диск №1 · Audio CD','Інший альбом. Потрібного запису немає.'],['mp3','Диск №2 · MP3','Потрібний запис збережено як файл MP3.'],['audio','Диск №3 · Audio CD','Потрібний запис у списку звукових доріжок.']].map(([id,label,text])=>btn(`<b>${label}</b><small>${text}</small>`,'pick-disc',id,'choice-button')).join('')}</div>${puzzleHelp()}`, 'Крок 1 з 2 · диск');
    const selected = { other: '№1 · Audio CD · інший альбом', mp3: '№2 · MP3 · потрібний запис', audio: '№3 · Audio CD · потрібний запис' }[disc];
    return speech('Анжела', `Обрано диск ${selected}. Тепер виріши, на чому його відтворити.`, `<div class="choices device-options">${btn('<b>Старий CD-програвач</b><small>На корпусі зазначено: підтримує лише Audio CD.</small>','pick-device','player','choice-button')}${btn('<b>Комп’ютер</b><small>Має CD-привід і програму для файлів MP3.</small>','pick-device','computer','choice-button')}</div>${btn('← Обрати інший диск','change-disc','','text-button')}${puzzleHelp()}`, 'Крок 2 з 2 · пристрій');
  }
  function puzzleHelp() { return `<div class="help-actions">${state.chapter !== 'tape' ? btn('Підказка', 'hint', '', 'text-button') : ''}${btn('Як це працює', 'knowledge', '', 'text-button')}${btn('Оглянути речі', 'explore', '', 'text-button')}</div>`; }
  function moveCard(index, to, focusDirection = '1') {
    if (to < 0 || to >= tapeOrder.length || to === index) return;
    const id = tapeOrder[index]; tapeOrder.splice(index, 1); tapeOrder.splice(to, 0, id);
    A.effect('click'); renderGame();
    const target = activeSurface().querySelector(`[data-move="${to}"][data-direction="${focusDirection}"]:not(:disabled)`) || activeSurface().querySelector(`[data-move="${to}"]:not(:disabled)`);
    target?.focus(); announce(`${S.fragments[id].name}: позиція ${to + 1} з 3.`);
  }
  function wireDrag() {
    activeSurface().querySelectorAll('[data-fragment]').forEach(card => {
      card.addEventListener('dragstart', e => { dragging = card.dataset.fragment; e.dataTransfer.setData('text/plain', dragging); e.dataTransfer.effectAllowed = 'move'; });
      card.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      card.addEventListener('drop', e => { e.preventDefault(); const from = tapeOrder.indexOf(dragging), to = tapeOrder.indexOf(card.dataset.fragment); if (from >= 0) moveCard(from, to); dragging = null; });
      card.addEventListener('dragend', () => { dragging = null; });
    });
  }
  function showJournal() {
    const notes = S.journal(state.choices);
    openModal('Те, що залишилося', notes.length ? notes.map((n, i) => `<article class="journal-entry"><span class="eyebrow">0${i + 1}</span><h3>${n.title}</h3><p>${n.text}</p></article>`).join('') : '<p>Поки що тут порожньо. Твої рішення з’являтимуться після кожної історії.</p>', 'ЩОДЕННИК');
  }
  function showEndings() {
    openModal('Відкриті фінали', `<p>Кожне завершення — інший спосіб залишити музику поруч. Відкрито ${unlocked.length} з 3.</p><div class="ending-gallery">${Object.entries(S.endings).map(([id, end], i) => unlocked.includes(id) ? `<article><span class="eyebrow">0${i + 1} · ВІДКРИТО</span><h3>${end.title}</h3><p>${end.quote}</p></article>` : `<article class="locked"><span class="eyebrow">0${i + 1} · ЩЕ НЕ ВІДКРИТО</span><h3>Історія попереду</h3><p>Дійди до фінального вибору й обери інше продовження.</p></article>`).join('')}</div>`, 'КОЛЕКЦІЯ ЗАВЕРШЕНЬ');
  }
  function credits() {
    openModal('Люди, звук і матеріали', '<p><strong>I still remember your sound</strong> — некомерційний студентський проєкт для курсу «Технології мультимедіа».</p><p>Авторка проєкту — єдина учасниця. Допомога з реалізацією й підготовкою матеріалів: Codex. Мальовані локації й персонажі: створено за допомогою OpenAI ImageGen, 2026.</p><p>Рухомі предмети: векторні шари проєкту. Механічні клацання, шум стрічки й паперу: процедурні звукові ефекти Web Audio. Це не записи популярних композицій.</p><p><strong>Музика епох ще добирається.</strong> У цій версії комерційних музичних записів немає. Після визначення джерел тут з’являться фактично використані назви, виконавці й відомості про використання.</p><p>Файли гри та зображення зберігаються локально. Реєстр джерел і статус матеріалів — у docs/materials.md.</p>', 'ТИТРИ · РОБОЧА ВЕРСІЯ');
  }
  function showSettings() {
    openModal('Твій спосіб слухати', `<div class="settings-form"><label for="music-volume">Музика <output id="music-value">${Math.round(A.settings.music * 100)}%</output></label><input id="music-volume" type="range" min="0" max="100" value="${Math.round(A.settings.music * 100)}"><label for="effects-volume">Ефекти <output id="effects-value">${Math.round(A.settings.effects * 100)}%</output></label><input id="effects-volume" type="range" min="0" max="100" value="${Math.round(A.settings.effects * 100)}"><label class="checkbox-label"><input id="muted" type="checkbox" ${A.settings.muted ? 'checked' : ''}> Вимкнути весь звук</label><label class="checkbox-label"><input id="motion" type="checkbox" ${reducedMotion ? 'checked' : ''}> Зменшити рух і переходи</label><p class="small">Усі завдання мають текстові підказки. Для керування використовуй Tab, Shift+Tab, Enter, Space; Escape закриває вікна.</p><p class="small">${storageWorks ? 'Прогрес автоматично зберігається в цьому браузері. Автономну копію та різні адреси браузер може зберігати окремо.' : 'Браузер не надає доступу до автозбереження. Експортуй файл, щоб повернутися до цього місця.'}</p><div class="save-actions">${btn('Зберегти у файл', 'export', '', 'secondary')}${btn('Завантажити з файлу', 'import', '', 'secondary')}</div></div>`, 'НАЛАШТУВАННЯ');
    document.querySelector('.settings-form').insertAdjacentHTML('afterbegin', `<label for="text-size">Розмір тексту</label><select id="text-size"><option value="standard" ${textSize === 'standard' ? 'selected' : ''}>Зручний</option><option value="large" ${textSize === 'large' ? 'selected' : ''}>Ще більший</option></select>`);
  }
  function startNew() {
    if (saved && !(saved.chapter === 'prologue' && !Object.keys(saved.seen).length)) {
      openModal('Почати нову історію?', `<p>Поточне проходження почнеться заново. Відкриті фінали залишаться у колекції.</p>${btn('Так, почати спочатку', 'confirm-new', '', 'primary')}${btn('Повернутися', 'close', '', 'text-button')}`, 'НОВЕ ПРОХОДЖЕННЯ');
    } else newGame();
  }
  function newGame() {
    if (modal.open) modal.close();
    interactionKind=null;interactionComplete=false;lastSpeaker=null;
    state = E.initialState(unlocked); inspection = null; inspectedObject = ''; visualEvent = ''; tapeOrder = ['meeting', 'unsaid', 'road']; disc = 'other'; device = 'player'; discStage = 'disc';
    A.unlock(); persist(); renderGame(); focusDialogue(true);
  }
  const actions = {
    new: startNew, 'confirm-new': newGame, close: closeModal,
    continue: () => { state = saved; inspection = null; interactionComplete=false;interactionKind=state.phase==='explore'&&F.presentation(state,S).activity==='puzzle'?'puzzle':null; A.unlock(); renderGame(); focusDialogue(true); },
    'next-line': advanceDialogue,
    'previous-line': () => { const p = F.presentation(state, S); state = { ...state, presentation: { key: p.key, cursor: Math.max(0, p.cursor - 1), activity: p.activity } }; persist(); renderGame(); focusDialogue(); },
    'start-puzzle': () => { state = F.startPuzzle(state, S);interactionKind='puzzle';interactionComplete=false; persist(); renderGame(); focusDialogue(); },
    'open-interaction': () => { interactionKind=inspection?'inspection':'puzzle';interactionComplete=state.phase==='choice';renderGame();focusDialogue(); },
    'close-interaction':closeInteraction,
    'complete-interaction':closeInteraction,
    settings:showSettings,
    explore: () => { interactionKind=null;interactionComplete=false;inspection=null;state = F.explore(state, S); persist(); renderGame(); focusDialogue(); },
    retry: () => dispatch('dismissFeedback'),
    'inspection-next': () => {
      if (!inspection) return;
      if (inspection.cursor === inspection.lines.length - 1) return finishInspection();
      inspection.cursor++; renderGame(); focusDialogue();
    },
    enter: () => dispatch('enter'), vinyl: v => { A.effect('click'); dispatch('vinyl', v); },
    choice: v => dispatch('choice', v), restore: () => { A.effect('paper'); discStage = 'disc'; dispatch('restore'); },
    'check-tape': () => { A.effect('rewind'); dispatch('tape', tapeOrder); },
    'pick-disc': v => { if (!['other', 'mp3', 'audio'].includes(v)) return; disc = v; discStage = 'device'; renderGame(); focusDialogue(); },
    'pick-device': v => { if (!['player', 'computer'].includes(v)) return; device = v; A.effect('click'); dispatch('disc', [disc, device]); },
    'change-disc': () => { discStage = 'disc'; renderGame(); focusDialogue(); },
    ending: v => dispatch('ending', v), backToFinale: () => dispatch('backToFinale'),
    hint: () => inspectText(S.chapters[state.chapter].person, S.chapters[state.chapter].hint),
    knowledge: () => inspectText('Про носій', S.chapters[state.chapter].knowledge),
    journal: showJournal, endings: showEndings, credits,
    about: () => openModal('Музика залишається', '<p>Інтерактивна історія про те, як час, кімната й спосіб слухання змінюють наше сприйняття музики.</p><p>Після збою мережі студентка знаходить коробку з носіями. Через речі й записки ти допоможеш відновити три історії. Це образна реконструкція спогадів.</p><p>У грі немає прихованої оцінки твоїх рішень. Помилки дають повторну спробу. Останній вибір визначає фінал.</p><p class="notice">Робоча версія: популярні музичні записи ще добираються; персонажі й механічні анімації вже додані.</p>' + btn('Титри й матеріали', 'credits', '', 'secondary'), 'ПРО ПРОЄКТ'),
    export: () => {
      const blob = new Blob([E.serialize(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'i-still-remember-your-sound-save.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Файл збереження підготовлено.');
    },
    import: () => document.querySelector('#import-save').click()
  };
  document.addEventListener('click', e => {
    const character = e.target.closest('[data-character]');
    if (character && Object.hasOwn(V.characters,character.dataset.character)) {
      const person=V.characters[character.dataset.character];
      openModal(person.name,`<img class="character-preview" src="assets/characters/${V.characterFile(character.dataset.character,state)}" alt="${person.name}">`,'ПЕРСОНАЖ');return;
    }
    const objectButton = e.target.closest('[data-object]');
    if (objectButton && mode === 'game') {
      const id = objectButton.dataset.object, obj = S.chapters[state.chapter].objects.find(o => o.id === id);
      if (!obj) return;
      inspectedObject = id;
      visualEvent = id === 'box' ? 'box' : '';
      A.unlock(); state = E.reduce(state, { type: 'inspect', value: id }); persist();
      inspectText(obj.label, obj.text, id); return;
    }
    const move = e.target.closest('[data-move]');
    if (move) { moveCard(Number(move.dataset.move), Number(move.dataset.move) + Number(move.dataset.direction), move.dataset.direction); return; }
    const button = e.target.closest('[data-action]');
    if (button && Object.hasOwn(actions, button.dataset.action)) { A.unlock(); actions[button.dataset.action](button.dataset.value); }
  });
  modal.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'music-volume' || id === 'effects-volume') {
      const kind = id.split('-')[0]; A.settings[kind] = Number(e.target.value) / 100; document.querySelector(`#${kind}-value`).textContent = `${e.target.value}%`;
    } else if (id === 'muted') A.settings.muted = e.target.checked;
    else if (id === 'motion') { reducedMotion = e.target.checked; document.body.classList.toggle('reduce-motion', reducedMotion); }
    else if (id === 'text-size') { textSize = e.target.value === 'large' ? 'large' : 'standard'; document.body.dataset.textSize = textSize; }
    else return;
    A.unlock(); A.apply(); write(SETTINGS, JSON.stringify({ ...A.settings, motion: reducedMotion, textSize }));
  });
  document.querySelector('#import-save').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const imported = file.size < 100000 ? E.parseSave(await file.text()) : null;
    if (!imported) return openModal('Файл не підходить', '<p>Це не збереження цієї гри або файл пошкоджений. Поточний прогрес залишився на місці.</p>', 'ЗБЕРЕЖЕННЯ');
    state = imported; inspection = null; inspectedObject = ''; visualEvent = ''; discStage = 'disc';interactionComplete=false;interactionKind=state.phase==='explore'&&F.presentation(state,S).activity==='puzzle'?'puzzle':null; if (modal.open) modal.close(); persist(); renderGame(); focusDialogue();
  });
  document.addEventListener('keydown', e => {
    if (mode !== 'game' || modal.open || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key === 'Escape' && inspection) { e.preventDefault();finishInspection(); return; }
    if (!['Enter', ' '].includes(e.key) || !['BODY', 'MAIN', 'P', 'H1'].includes(e.target.tagName)) return;
    const next = activeSurface().querySelector('.dialogue-next');
    if (next) { e.preventDefault(); next.click(); }
  });
  document.querySelector('#journal').addEventListener('click', showJournal);
  document.querySelector('#settings').addEventListener('click', showSettings);
  document.querySelector('#menu').addEventListener('click', () => { renderMenu(); document.querySelector('#menu-heading').focus(); });
  document.querySelector('#brand').addEventListener('click', () => { renderMenu(); document.querySelector('#menu-heading').focus(); });
  document.addEventListener('music-unavailable', musicStatus);
  renderMenu();
})();
