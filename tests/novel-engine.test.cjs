const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js');
const act=(s,type,value)=>E.reduce(s,{type,value});
const next=s=>E.reduce(s,{type:'next',length:1});
function chapterStart(s){s=next(s);if(s.chapter==='prologue')s=act(s,'enter');if(s.phase==='intro')s=next(s);return act(s,'startPuzzle');}
function solve(s,good){
 if(s.chapter==='vinyl'){
  s=act(s,'vinyl','edges');
  if(!good){s=act(s,'vinyl','rough');return act(s,'confirmRisk');}
  for(const x of ['clean','place','33','play'])s=act(s,'vinyl',x);
 }else if(s.chapter==='tape'){
  s=act(s,'moveTape',[2,0]);s=act(s,'checkTape');
  s=act(s,'selectSource',good?'A':'B');s=act(s,'selectTarget',good?'B':'A');s=act(s,'copyTape');s=act(s,'confirmRisk');
 }else{s=act(s,'selectDisc',good?'concert':'rehearsal');s=act(s,'archiveDisc');s=act(s,'confirmRisk');}
 return s;
}
test('all eight outcome combinations automatically choose eight endings and preserve photos',()=>{
 const seen=new Set();
 for(let n=0;n<8;n++){
  const bits=n.toString(2).padStart(3,'0');let s=chapterStart(E.initialState());
  for(let i=0;i<3;i++){const id=s.chapter;s=solve(s,bits[i]==='1');assert.equal(s.outcomes[id],bits[i]==='1');assert.equal(s.phase,'result');s=next(next(next(s)));if(s.chapter!=='finale')s=chapterStart(s);}
  assert.equal(s.chapter,'finale');s=next(s);assert.equal(s.phase,'finale');s=act(s,'finish');assert.equal(s.ending,bits);seen.add(s.ending);assert.equal(E.photos(s).length,3);assert.ok(E.parseSave(E.serialize(s)));
 }
 assert.equal(seen.size,8);
});
test('minor errors retry, irreversible damage requires explicit confirmation and cannot be undone',()=>{
 let s=chapterStart(E.initialState());s=act(s,'vinyl','surface');assert.equal(s.step,0);assert.equal(s.outcomes.vinyl,undefined);
 s=act(s,'dismissFeedback');s=act(s,'vinyl','edges');s=act(s,'vinyl','rough');assert.ok(s.pendingRisk);assert.equal(s.outcomes.vinyl,undefined);
 const cancelled=act(s,'cancelRisk');assert.equal(cancelled.step,1);assert.equal(cancelled.pendingRisk,null);
 s=act(s,'confirmRisk');assert.equal(s.outcomes.vinyl,false);assert.equal(act(s,'vinyl','clean'),s);
});
test('both tape routes confirm overwrite and inspection never solves the task',()=>{
 let s=chapterStart(E.initialState());s=solve(s,true);s=next(next(next(s)));s=chapterStart(s);
 s=act(s,'inspect','letter');assert.equal(s.phase,'puzzle');assert.equal(s.step,0);
 s=act(s,'checkTape');assert.ok(s.feedback);assert.equal(s.step,0);s=act(s,'dismissFeedback');s=act(s,'moveTape',[2,0]);s=act(s,'checkTape');assert.equal(s.step,1);
 s=act(s,'selectSource','A');s=act(s,'selectTarget','B');s=act(s,'copyTape');assert.equal(s.pendingRisk.kind,'copy');assert.equal(act(s,'selectTarget','A'),s);
 s=act(s,'confirmRisk');assert.equal(s.outcomes.tape,true);
});
test('CD evidence preview requires compatibility; unchecked archiving is a visible risk',()=>{
 let s=chapterStart(E.initialState());s=solve(s,true);s=chapterStart(next(next(next(s))));s=solve(s,true);s=chapterStart(next(next(next(s))));
 s=act(s,'selectDisc','concert');s=act(s,'selectDevice','player');s=act(s,'previewDisc');assert.equal(s.puzzle.verified,false);assert.ok(s.feedback);
 s=act(s,'dismissFeedback');s=act(s,'selectDevice','computer');s=act(s,'previewDisc');assert.equal(s.puzzle.verified,true);assert.match(s.puzzle.preview,/23:18/);
 s=act(s,'archiveDisc');assert.equal(s.outcomes.cd,undefined);s=act(s,'confirmRisk');assert.equal(s.outcomes.cd,true);
});
test('save rejects impossible/future outcomes, oversized input, and recognises legacy without overwriting it',()=>{
 const s=E.initialState();assert.ok(E.parseSave(E.serialize(s)));assert.equal(E.parseSave('{'),null);
 assert.equal(E.parseSave(JSON.stringify({...s,outcomes:{cd:true}})),null);
 assert.equal(E.parseSave(JSON.stringify({...s,song:{title:'x'.repeat(101),memory:''}})),null);
 const old={version:1,chapter:'finale',phase:'explore',choices:{vinyl:'side',tape:'letter',cd:'backup'},seen:{},unlocked:[],ending:null,feedback:'',step:0};
 const migrated=E.parseSave(JSON.stringify(old));assert.equal(migrated.version,2);assert.equal(migrated.chapter,'prologue');assert.equal(migrated.migrated,true);
});
test('personal text is bounded, ending cannot be selected by an action, and endings survive restart',()=>{
 let s=chapterStart(E.initialState());for(let i=0;i<3;i++){s=solve(s,true);s=next(next(next(s)));if(s.chapter!=='finale')s=chapterStart(s);}s=next(s);
 s=act(s,'setSong',{title:'  Моя пісня  ',memory:'Наш вечір'});assert.equal(s.song.title,'Моя пісня');s=act(s,'finish','000');assert.equal(s.ending,'111');assert.deepEqual(E.initialState(s.unlocked).unlocked,['111']);
});
test('save cannot skip tape chronology or smuggle a completed vinyl step into an opening',()=>{
 let s=chapterStart(E.initialState());assert.equal(E.parseSave(JSON.stringify({...s,phase:'intro',step:5})),null);
 s=solve(s,true);s=chapterStart(next(next(next(s))));assert.equal(E.parseSave(JSON.stringify({...s,step:1})),null);
});
