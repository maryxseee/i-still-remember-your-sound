(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameMusic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const tracks={
    vinyl:{title:'Fleetwood Mac — Dreams',video:'Y3ywicffOj4'},
    tape:{title:'The Cranberries — Dreams',video:'Yam5uK6e-bQ'},
    cd:{title:'Coldplay — Clocks',video:'d020hcWA_Wg'}
  };
  let chapter=null,eligible=false,player=null,ready=false,request=0,apiPromise,source=null,playerTimeout;
  const local=new Map();
  const panel=()=>document.querySelector('#music-panel');
  const audio=()=>document.querySelector('#local-music');
  const message=text=>{document.querySelector('#music-message').textContent=text;};
  function settings(){return window.GameAudio.settings;}
  function apply(){
    const s=settings(),volume=s.muted?0:s.music;
    audio().volume=volume;
    if(ready&&player){player.setVolume(volume*100);s.muted?player.mute():player.unMute();}
  }
  function clearPlayer(){request++;clearTimeout(playerTimeout);if(player){player.destroy();player=null;}ready=false;source=null;audio().pause();document.querySelector('#online-music').replaceChildren();}
  function stop(){clearPlayer();chapter=null;eligible=false;panel().hidden=true;}
  function pause(){audio().pause();if(ready&&player)player.pauseVideo();}
  function scene(next,playing,lost){
    if(!tracks[next])return stop();
    const available=playing&&!lost;
    if(next!==chapter){
      clearPlayer();chapter=next;eligible=available;panel().hidden=false;
      document.querySelector('#music-title').textContent=tracks[next].title;
      const link=document.querySelector('#music-link');link.href=`https://www.youtube.com/watch?v=${tracks[next].video}`;
      audio().hidden=true;message('Музика відкриється після відновлення запису.');
    }
    const becameAvailable=available&&!eligible;eligible=available;
    document.querySelector('#enable-online').disabled=!eligible;
    document.querySelector('#choose-music').disabled=!eligible;
    if(!eligible){pause();audio().hidden=true;if(player){clearPlayer();}message(lost?'Носій зник — настала тиша.':'Віднови запис, щоб послухати цю композицію.');}
    else if(becameAvailable||!source){
      message('Запис відновлено. Увімкни офіційне відео або вибери свій аудіофайл.');
      if(local.has(chapter)&&(becameAvailable||source!=='local'))useLocal();
    }
  }
  function loadAPI(){
    if(window.YT?.Player)return Promise.resolve();
    if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('timeout')),15000);
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve();};
      const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
      script.onerror=()=>{clearTimeout(timeout);reject(new Error('network'));};document.head.append(script);
    }).catch(error=>{apiPromise=null;throw error;});return apiPromise;
  }
  async function online(){
    if(!eligible)return;
    clearPlayer();const token=request,target=chapter;source='online';audio().hidden=true;message('Завантажуємо офіційний програвач…');
    try{
      await loadAPI();if(token!==request||target!==chapter||!eligible)return;
      const slot=document.createElement('div');slot.id='youtube-player';document.querySelector('#online-music').append(slot);
      playerTimeout=setTimeout(()=>{if(token===request&&!ready)message('Програвач не відповідає. Спробуй «Слухати онлайн» ще раз, відкрий офіційне відео або вибери локальний файл.');},15000);
      player=new window.YT.Player(slot,{width:'100%',height:270,videoId:tracks[chapter].video,host:'https://www.youtube-nocookie.com',playerVars:{playsinline:1,origin:location.origin,autoplay:0},events:{
        onReady:()=>{if(token!==request)return;clearTimeout(playerTimeout);ready=true;apply();message('Натисни ▶ у програвачі. Для онлайн-музики потрібен інтернет.');},
        onError:()=>{if(token===request){clearTimeout(playerTimeout);message('Відео недоступне у вбудованому програвачі. Відкрий його на YouTube або вибери локальний файл.');}}
      }});
    }catch{if(token===request)message('Не вдалося підключити YouTube. Можна відкрити офіційне відео або вибрати локальний файл.');}
  }
  function useLocal(){
    if(!eligible||!local.has(chapter))return;
    clearPlayer();source='local';audio().src=local.get(chapter);audio().hidden=false;apply();
    message('Аудіофайл із твого пристрою. Він не завантажується в мережу.');
    audio().play().catch(()=>message('Натисни ▶ в аудіопрогравачі.'));
  }
  function init(){
    document.querySelector('#enable-online').addEventListener('click',online);
    document.querySelector('#choose-music').addEventListener('click',()=>document.querySelector('#music-file').click());
    document.querySelector('#music-file').addEventListener('change',e=>{
      const file=e.target.files[0];e.target.value='';if(!file||!eligible)return;
      if(file.type&&!file.type.startsWith('audio/'))return message('Обери аудіофайл MP3, OGG, WAV або M4A.');
      if(local.has(chapter))URL.revokeObjectURL(local.get(chapter));local.set(chapter,URL.createObjectURL(file));useLocal();
    });
    audio().addEventListener('error',()=>message('Браузер не зміг прочитати цей аудіофайл. Спробуй інший.'));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
  return {tracks,scene,stop,apply};
});
