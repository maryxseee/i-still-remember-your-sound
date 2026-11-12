(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const chapters=['prologue','vinyl','tape','cd','finale'],core=['vinyl','tape','cd'],endings=Array.from({length:8},(_,n)=>n.toString(2).padStart(3,'0'));
const objectIds={prologue:['phone','headphones','box','note'],vinyl:['sleeve','invitation','record','turntable'],tape:['cassette','player','letter','list'],cd:['discs','computer','player','catalog'],finale:['collection','journal']};
const freshPuzzle=()=>({order:['meeting','unsaid','road'],source:null,target:null,disc:null,device:null,verified:false,preview:''});
function initialState(unlocked=[]){return {version:2,chapter:'prologue',phase:'intro',cursor:0,step:0,seen:{},outcomes:{},unlocked:[...new Set(unlocked.filter(x=>endings.includes(x)))],ending:null,feedback:'',pendingRisk:null,hintLevel:0,puzzle:freshPuzzle(),song:{title:'',memory:''}};}
function endingKey(s){return core.every(id=>typeof s.outcomes[id]==='boolean')?core.map(id=>s.outcomes[id]?'1':'0').join(''):null;}
function photos(s){return core.filter(id=>typeof s?.outcomes?.[id]==='boolean');}
function resolve(s,saved){s.outcomes[s.chapter]=saved;s.phase='result';s.cursor=0;s.feedback='';s.pendingRisk=null;return s;}
function cleanText(value,max){return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max);}
const vinylSteps=['edges','clean','place','33','play'];
const discs={rehearsal:{format:'audio',label:'Мідний диск · «Вечір»',preview:'17:40 · Репліка на початку: «Раз, два… Почали? Давайте ще раз із приспіву». Дата: 13 травня 2004.'},concert:{format:'mp3',label:'Срібний диск · «14-05»',preview:'23:18 · Репліка на початку: «Для тих, хто сьогодні тут». Далі чути оголошення дванадцяти номерів та оплески. Дата: 14 травня 2004.'},fragment:{format:'audio',label:'Синій диск · без назви',preview:'04:12 · Запис переривається посеред третього номера. Дата на коробці: 14 травня 2004.'}};
function reduce(state,action){
 if(!state||!action||typeof action.type!=='string')return state;
 const s=JSON.parse(JSON.stringify(state)),v=action.value;
 if(s.pendingRisk&&!['confirmRisk','cancelRisk','inspect','hint','dismissFeedback'].includes(action.type))return state;
 switch(action.type){
 case 'next':{
  if(!['intro','result','absence','closure','ended'].includes(s.phase)||!Number.isInteger(action.length)||action.length<1||action.length>200)return state;
  s.cursor=Math.min(s.cursor+1,action.length);if(s.cursor<action.length||s.phase==='ended')return s;
  s.cursor=0;
  if(s.phase==='intro')s.phase=s.chapter==='finale'?'finale':'explore';
  else if(s.phase==='result')s.phase='absence';
  else if(s.phase==='absence')s.phase='closure';
  else {s.chapter=chapters[chapters.indexOf(s.chapter)+1];s.phase='intro';s.step=0;s.puzzle=freshPuzzle();s.hintLevel=0;}
  return s;
 }
 case 'enter':if(s.chapter!=='prologue'||s.phase!=='explore')return state;s.chapter='vinyl';s.phase='intro';s.cursor=0;return s;
 case 'inspect':if(!['explore','puzzle','finale'].includes(s.phase)||!objectIds[s.chapter].includes(v))return state;s.seen[s.chapter]=[...new Set([...(s.seen[s.chapter]||[]),v])];return s;
 case 'startPuzzle':if(!core.includes(s.chapter)||s.phase!=='explore')return state;s.phase='puzzle';s.feedback='';return s;
 case 'explore':if(s.phase!=='puzzle')return state;s.phase='explore';s.feedback='';return s;
 case 'dismissFeedback':if(!s.feedback)return state;s.feedback='';return s;
 case 'hint':if(!['explore','puzzle'].includes(s.phase)||!core.includes(s.chapter))return state;s.hintLevel=Math.min(3,s.hintLevel+1);return s;
 case 'cancelRisk':if(!s.pendingRisk)return state;s.pendingRisk=null;return s;
 case 'vinyl':{
  if(s.chapter!=='vinyl'||s.phase!=='puzzle')return state;
  const risk={1:'rough',2:'rush',4:'force'};
  if(v===risk[s.step]){s.pendingRisk={kind:'vinyl',value:v};return s;}
  if(v!==vinylSteps[s.step]){s.feedback=['На канавках можуть залишитися сліди. Придивись, як тримає платівку Джессіка.','Матеріали біля програвача відрізняються. Для чого тут кожен із них?','Платівка ще в руках. Спершу визнач для неї безпечне місце.','Звучання залежить від швидкості. На самій платівці є позначення.','Тонарм не потребує сили. Ще раз оглянь механізм.'][s.step];return s;}
  s.step++;s.feedback='';return s.step===5?resolve(s,true):s;
 }
 case 'moveTape':{
  if(s.chapter!=='tape'||s.phase!=='puzzle'||s.step!==0||!Array.isArray(v)||v.length!==2)return state;
  const [from,to]=v;if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>2||to<0||to>2||from===to)return state;
  const [id]=s.puzzle.order.splice(from,1);s.puzzle.order.splice(to,0,id);s.feedback='';return s;
 }
 case 'checkTape':if(s.chapter!=='tape'||s.phase!=='puzzle'||s.step!==0)return state;if(s.puzzle.order.join(',')!=='road,meeting,unsaid'){s.feedback='Спогади поки не складаються в одну розповідь. Зістав події в листі та на фотографії.';return s;}s.step=1;s.feedback='';return s;
 case 'selectSource':case 'selectTarget':if(s.chapter!=='tape'||s.phase!=='puzzle'||s.step!==1||!['A','B'].includes(v))return state;s.puzzle[action.type==='selectSource'?'source':'target']=v;s.feedback='';return s;
 case 'copyTape':if(s.chapter!=='tape'||s.phase!=='puzzle'||s.step!==1)return state;if(!s.puzzle.source||!s.puzzle.target||s.puzzle.source===s.puzzle.target){s.feedback='Потрібні дві різні касети: одна для відтворення, інша для запису.';return s;}s.pendingRisk={kind:'copy',value:s.puzzle.source+s.puzzle.target};return s;
 case 'selectDisc':if(s.chapter!=='cd'||s.phase!=='puzzle'||!Object.hasOwn(discs,v))return state;s.puzzle.disc=v;s.puzzle.verified=false;s.puzzle.preview='';s.feedback='';return s;
 case 'selectDevice':if(s.chapter!=='cd'||s.phase!=='puzzle'||!['computer','player'].includes(v))return state;s.puzzle.device=v;s.puzzle.verified=false;s.puzzle.preview='';s.feedback='';return s;
 case 'previewDisc':{
  if(s.chapter!=='cd'||s.phase!=='puzzle')return state;
  const d=discs[s.puzzle.disc];if(!d||!s.puzzle.device){s.feedback='Спочатку обери диск і пристрій для перевірки.';return s;}
  if(d.format==='mp3'&&s.puzzle.device==='player'){s.feedback='Пристрій не розпізнав запис. Оглянь його позначення й формат диска.';return s;}
  s.puzzle.verified=true;s.puzzle.preview=d.preview;s.feedback='';return s;
 }
 case 'archiveDisc':if(s.chapter!=='cd'||s.phase!=='puzzle'||!Object.hasOwn(discs,s.puzzle.disc))return state;s.pendingRisk={kind:'archive',value:s.puzzle.disc};return s;
 case 'confirmRisk':{
  const r=s.pendingRisk;if(s.phase!=='puzzle'||!r)return state;
  if(r.kind==='vinyl'&&s.chapter==='vinyl'&&({1:'rough',2:'rush',4:'force'})[s.step]===r.value)return resolve(s,false);
  if(r.kind==='copy'&&s.chapter==='tape'&&s.step===1&&['AB','BA'].includes(r.value))return resolve(s,r.value==='AB');
  if(r.kind==='archive'&&s.chapter==='cd'&&Object.hasOwn(discs,r.value))return resolve(s,r.value==='concert');
  return state;
 }
 case 'setSong':if(s.chapter!=='finale'||s.phase!=='finale'||!v||typeof v!=='object')return state;s.song={title:cleanText(v.title,100),memory:cleanText(v.memory,500)};return s;
 case 'finish':if(s.chapter!=='finale'||s.phase!=='finale'||!endingKey(s))return state;s.ending=endingKey(s);s.phase='ended';s.cursor=0;s.unlocked=[...new Set([...s.unlocked,s.ending])];return s;
 default:return state;
 }
}
function serialize(s){return JSON.stringify(s);}
function parseSave(text){
 try{
  if(typeof text!=='string'||text.length>100000)return null;const v=JSON.parse(text);
  if(v?.version===1&&chapters.includes(v.chapter)&&v.choices&&typeof v.choices==='object'&&v.seen&&typeof v.seen==='object'&&Array.isArray(v.unlocked)){const s=initialState();s.migrated=true;return s;}
  if(!v||v.version!==2||!chapters.includes(v.chapter)||!['intro','explore','puzzle','result','absence','closure','finale','ended'].includes(v.phase))return null;
  if(!Number.isInteger(v.cursor)||v.cursor<0||v.cursor>200||!Number.isInteger(v.step)||v.step<0||v.step>5||!Number.isInteger(v.hintLevel)||v.hintLevel<0||v.hintLevel>3)return null;
  if(!v.outcomes||typeof v.outcomes!=='object'||Array.isArray(v.outcomes)||Object.entries(v.outcomes).some(([id,b])=>!core.includes(id)||typeof b!=='boolean'))return null;
  const index=chapters.indexOf(v.chapter);for(const id of core){const ci=chapters.indexOf(id),has=typeof v.outcomes[id]==='boolean';if(ci<index&&!has||ci>index&&has)return null;if(ci===index&&has!==['result','absence','closure'].includes(v.phase))return null;}
  if(!v.seen||typeof v.seen!=='object'||Array.isArray(v.seen)||Object.entries(v.seen).some(([id,list])=>!objectIds[id]||!Array.isArray(list)||list.length>10||list.some(x=>!objectIds[id].includes(x))))return null;
  if(!Array.isArray(v.unlocked)||v.unlocked.length>8||v.unlocked.some(id=>!endings.includes(id))||typeof v.feedback!=='string'||v.feedback.length>2000)return null;
  if(!v.song||typeof v.song.title!=='string'||v.song.title.length>100||typeof v.song.memory!=='string'||v.song.memory.length>500)return null;
  if(v.chapter==='prologue'&&!['intro','explore'].includes(v.phase)||v.chapter==='finale'&&!['intro','finale','ended'].includes(v.phase)||core.includes(v.chapter)&&['finale','ended'].includes(v.phase))return null;
  if(v.chapter==='vinyl'&&(['intro','explore','puzzle'].includes(v.phase)&&v.step>=5||v.phase==='intro'&&v.step!==0)||v.chapter==='tape'&&v.step>1||['prologue','cd','finale'].includes(v.chapter)&&v.step!==0)return null;
  if(v.phase==='ended'&&(v.ending!==endingKey(v)||!v.unlocked.includes(v.ending))||v.phase!=='ended'&&v.ending!==null)return null;
  const p=v.puzzle;if(!p||!Array.isArray(p.order)||p.order.length!==3||new Set(p.order).size!==3||p.order.some(x=>!['road','meeting','unsaid'].includes(x)))return null;
  if(v.chapter==='tape'&&v.step===1&&p.order.join(',')!=='road,meeting,unsaid')return null;
  if(![null,'A','B'].includes(p.source)||![null,'A','B'].includes(p.target)||![null,...Object.keys(discs)].includes(p.disc)||![null,'computer','player'].includes(p.device)||typeof p.verified!=='boolean'||typeof p.preview!=='string'||p.preview.length>1000)return null;
  if(v.pendingRisk!==null){const r=v.pendingRisk;if(!r||v.phase!=='puzzle')return null;const valid=r.kind==='vinyl'&&v.chapter==='vinyl'&&({1:'rough',2:'rush',4:'force'})[v.step]===r.value||r.kind==='copy'&&v.chapter==='tape'&&v.step===1&&['AB','BA'].includes(r.value)&&r.value===p.source+p.target||r.kind==='archive'&&v.chapter==='cd'&&r.value===p.disc&&Object.hasOwn(discs,r.value);if(!valid)return null;}
  const s=initialState(v.unlocked);for(const k of ['chapter','phase','cursor','step','seen','outcomes','ending','feedback','hintLevel','puzzle','pendingRisk'])s[k]=v[k];s.song={title:cleanText(v.song.title,100),memory:cleanText(v.song.memory,500)};if(v.migrated===true)s.migrated=true;return s;
 }catch{return null;}
}
return {initialState,reduce,endingKey,photos,serialize,parseSave,discs,chapters,endings};
});
