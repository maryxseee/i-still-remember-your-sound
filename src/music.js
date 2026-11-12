(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameMusic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const track=(title,file,slug)=>({title,artist:'Scott Buckley',file:`assets/audio/${file}.mp3`,license:'CC BY 4.0',page:`https://www.scottbuckley.com.au/library/${slug}/`});
  const childhood=track('Childhood','childhood','childhood');
  const tracks={prologue:childhood,vinyl:track('Golden Hour','golden-hour','golden-hour'),tape:track('Reverie','reverie','reverie'),cd:childhood,finale:childhood};
  let desired=null,activeFile=null,armed=false,pending=false,sequence=0,transitionTimer=null,context=null,gain=null,chapter=null;
  const audio=()=>document.querySelector('#game-music');
  const settings=()=>window.GameAudio.settings;
  const message=text=>{document.querySelector('#music-message').textContent=text;};
  const retry=visible=>{document.querySelector('#music-retry').hidden=!visible;};
  function level(value,seconds=.45){
    const a=audio(),s=settings();a.muted=s.muted;
    if(gain&&context){a.volume=1;const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(s.muted?0:value,t+seconds);}
    else a.volume=s.muted?0:Math.max(0,Math.min(1,value));
  }
  function connect(){
    if(context)return;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;context=new AC();gain=context.createGain();gain.gain.value=0;context.createMediaElementSource(audio()).connect(gain);gain.connect(context.destination);}catch{context=null;gain=null;}
  }
  function cancelTransition(){clearTimeout(transitionTimer);transitionTimer=null;}
  function start(token=sequence){
    if(token!==sequence||!desired||!armed||document.hidden)return;
    const a=audio(),file=desired.file;
    if(file!==activeFile){a.src=file;a.load();activeFile=file;pending=false;}
    if(pending||!a.paused){apply();return;}
    pending=true;retry(false);message('Музика завантажується…');level(settings().music,.65);
    try{Promise.resolve(a.play()).then(()=>{if(token===sequence)pending=false;},error=>{
      if(token!==sequence)return;pending=false;retry(true);
      message(error?.name==='NotAllowedError'?'Браузер очікує дотик для звуку. Натисни «Увімкнути музику».':'Не вдалося завантажити музику. Натисни «Увімкнути музику», щоб повторити.');
    });}catch{pending=false;retry(true);message('Натисни «Увімкнути музику», щоб повторити запуск.');}
  }
  function unlock(){
    armed=true;connect();if(context)context.resume().catch(()=>{});
    if(desired&&!transitionTimer&&audio().paused)start();
  }
  function apply(){level(desired&&armed&&!document.hidden?settings().music:0,.12);}
  function scene(next,playing,lost){
    if(!tracks[next])return stop();
    const target=lost?null:tracks[next];
    document.querySelector('#music-panel').hidden=false;
    document.querySelector('#music-title').textContent=tracks[next].title+' — Scott Buckley';
    const credit=document.querySelector('#music-credit');credit.href=tracks[next].page;credit.textContent='Scott Buckley · CC BY 4.0';
    if(chapter===next&&desired===target)return;
    chapter=next;desired=target;sequence++;cancelTransition();pending=false;const token=sequence;
    if(!target){retry(false);message('У цьому можливому житті музика не прозвучала.');level(0,.3);transitionTimer=setTimeout(()=>{transitionTimer=null;if(token===sequence&&!desired)audio().pause();},320);return;}
    if(!armed){message('Почни історію, щоб почути музику.');return;}
    if(activeFile&&activeFile!==target.file&&!audio().paused){
      level(0,.32);message('Наступний спогад…');transitionTimer=setTimeout(()=>{transitionTimer=null;if(token!==sequence)return;audio().pause();start(token);},350);
    }else start(token);
  }
  function stop(){sequence++;cancelTransition();desired=null;chapter=null;pending=false;audio().pause();activeFile=null;level(0,0);document.querySelector('#music-panel').hidden=true;}
  function init(){
    const a=audio();a.loop=true;a.preload='auto';a.setAttribute('playsinline','');
    document.querySelector('#music-retry').addEventListener('click',()=>{sequence++;cancelTransition();pending=false;a.pause();activeFile=null;unlock();});
    a.addEventListener('playing',()=>{if(!desired||document.hidden){a.pause();return;}pending=false;retry(false);message('Звучить: '+desired.title+'. Гучність — у налаштуваннях.');});
    a.addEventListener('waiting',()=>{if(desired)message('Музика завантажується…');});
    a.addEventListener('error',()=>{if(!desired)return;pending=false;retry(true);message('Запис не завантажився. Перевір з’єднання й натисни «Увімкнути музику».');});
    document.addEventListener('visibilitychange',()=>{sequence++;cancelTransition();pending=false;if(document.hidden)a.pause();else if(desired&&armed){if(context)context.resume().catch(()=>{});start();}});
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
  return {tracks,scene,stop,apply,unlock};
});
