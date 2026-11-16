const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/flow.js'),S=require('../src/story.js'),E=require('../src/engine.js');
test('compact pages retain every word and speaker in order in every story branch',()=>{
 for(const chapter of E.chapters)for(const phase of ['intro','result','absence','closure','ended'])for(const outcome of [true,false]){
  if(['result','absence','closure'].includes(phase)&&!['vinyl','tape','cd'].includes(chapter)||phase==='ended'&&chapter!=='finale')continue;
  const s={...E.initialState(),chapter,phase,ending:'111',outcomes:{[chapter]:outcome}},original=F.sequence(s,S),collected=[];let pages=0;
  while(s.cursor<original.length){const p=F.page(s,S);assert.ok(p.parts.length>=1&&p.parts.length<=2);collected.push(...p.parts);s.cursor+=p.count;pages++;}
  assert.deepEqual(collected,original);assert.ok(pages<=Math.ceil(original.length/2));
 }
});
test('page advance consumes exactly the displayed lines and preserves old save cursors',()=>{
 const s=E.initialState();s.cursor=3;const p=F.page(s,S);assert.equal(p.parts[0].text,F.sequence(s,S)[3].text);
 const next=E.reduce(s,{type:'next',length:F.sequence(s,S).length,count:p.count});assert.equal(next.cursor,3+p.count);
 const last={...s,cursor:F.sequence(s,S).length-1};assert.equal(F.page(last,S).count,1);assert.equal(E.reduce(last,{type:'next',length:F.sequence(last,S).length,count:1}).phase,'explore');
});
test('all eight endings retain their exact dialogue, and a two-line page cannot cross a phase boundary',()=>{
 for(const ending of E.endings){let s={...E.initialState(),chapter:'finale',phase:'ended',ending},all=[];const expected=F.sequence(s,S);while(s.cursor<expected.length){const p=F.page(s,S);all.push(...p.parts);s=E.reduce(s,{type:'next',length:expected.length,count:p.count});}assert.deepEqual(all,expected);}
 const s=E.initialState(),length=F.sequence(s,S).length;
 const n=E.reduce({...s,cursor:length-2},{type:'next',length,count:2});assert.equal(n.phase,'explore');assert.equal(n.cursor,0);
 assert.equal(E.reduce(s,{type:'next',length,count:20}),s);
});
