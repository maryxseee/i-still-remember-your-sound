const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/flow.js'),S=require('../src/story.js'),E=require('../src/engine.js');
test('every dialogue window contains one complete authored speaker turn',()=>{
 for(const chapter of E.chapters)for(const phase of ['intro','result','absence','closure','ended'])for(const outcome of [true,false]){
  if(['result','absence','closure'].includes(phase)&&!['vinyl','tape','cd'].includes(chapter)||phase==='ended'&&chapter!=='finale')continue;
  const s={...E.initialState(),chapter,phase,ending:'111',outcomes:{[chapter]:outcome}},sequence=F.sequence(s,S);
  for(let cursor=0;cursor<sequence.length;cursor++){const p=F.page({...s,cursor},S);assert.equal(p.parts.length,1);assert.equal(p.count,1);assert.deepEqual(p.parts[0],sequence[cursor]);}
 }
});
test('rewritten memory introductions need fewer clicks and keep complete thoughts together',()=>{
 for(const chapter of ['vinyl','tape','cd']){const beats=F.sequence({...E.initialState(),chapter},S);assert.ok(beats.length<=12,`${chapter}: ${beats.length}`);assert.deepEqual(beats,S.chapters[chapter].intro);}
 const thought={speaker:'Марко',text:'Це завершена думка. '.repeat(20)};
 assert.deepEqual(F.sequence(E.initialState(),{chapters:{prologue:{intro:[thought]}}}),[thought]);
});
test('legacy saves restart only their current dialogue, preserving outcomes and puzzle progress',()=>{
 const s={...E.initialState(),storyRevision:1,cursor:8};const fixed=F.restore(s,S);assert.equal(fixed.cursor,0);assert.equal(fixed.storyRevision,2);
 const current={...E.initialState(),cursor:3};assert.equal(F.restore(current,S).cursor,3);
 const puzzle={...E.initialState(),storyRevision:1,chapter:'tape',phase:'puzzle',step:1,outcomes:{vinyl:true}};const restored=F.restore(puzzle,S);assert.equal(restored.step,1);assert.deepEqual(restored.outcomes,{vinyl:true});
});
