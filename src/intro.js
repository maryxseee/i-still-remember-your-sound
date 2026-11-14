(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.createGameIntro=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(options){
 'use strict';
 const {video,dialog,resume,skip,message,document}=options;
 let active=false,token=0,onFinish=null;
 function pausedNotice(){resume.hidden=false;message.textContent='Продовжити відео зі звуком або пропустити вступ.';}
 function playMedia(){
  const attempt=++token;resume.hidden=true;message.textContent='Музика обірветься, коли зникне з’єднання.';
  try{Promise.resolve(video.play()).catch(()=>{if(active&&attempt===token)pausedNotice();});}
  catch{if(active&&attempt===token)pausedNotice();}
 }
 function finish(){
  if(!active)return;
  active=false;token++;const next=onFinish;onFinish=null;
  video.pause();video.removeAttribute('src');video.load();resume.hidden=true;
  if(dialog.open)dialog.close();next?.();
 }
 function play(settings,next){
  if(active)return;
  active=true;onFinish=next;video.src='assets/video/connection-intro.mp4';video.currentTime=0;
  video.muted=settings.muted;video.volume=Math.max(0,Math.min(1,settings.music));
  dialog.showModal();skip.focus();playMedia();
 }
 video.addEventListener('ended',finish);
 video.addEventListener('error',finish);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 dialog.addEventListener('close',finish);
 document.addEventListener('visibilitychange',()=>{if(active&&document.hidden){token++;video.pause();pausedNotice();}});
 return {play,finish,resume:()=>{if(active)playMedia();}};
});
