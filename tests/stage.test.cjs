const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js');
const V=require('../src/visual.js');
test('ordinary narrative scene never contains a floating mechanism',()=>{
 for(const chapter of ['prologue','vinyl','tape','cd','finale']){
  const s={...E.initialState(),chapter};
  const room=V.render(s,{speaker:'Твоя думка'});
  assert.doesNotMatch(room,/<svg\b/);
  assert.match(room,/character-heroine/);
  assert.match(V.mechanism(s),/<svg\b/);
 }
});
test('heroine mood is sad for an error, happy for a correct result, neutral at the beginning',()=>{
 const start=E.initialState();assert.equal(V.heroineMood(start),'neutral');
 let s=E.reduce(start,{type:'enter'});
 s=E.reduce(s,{type:'vinyl',value:'surface'});assert.equal(V.heroineMood(s),'sad');
 assert.match(V.render(s),/heroine-vinyl-sad\.png/);
 s=E.reduce(s,{type:'vinyl',value:'edges'});assert.equal(V.heroineMood(s),'happy');
 assert.match(V.render(s),/heroine-vinyl-happy\.png/);
});
test('memory transitions do not run for dialogue advances or ordinary puzzle steps',()=>{
 const s=E.initialState();
 const v=E.reduce(s,{type:'enter'});
 assert.equal(V.transitionKind(s,v),'memory');
 assert.equal(V.transitionKind(v,E.reduce(v,{type:'vinyl',value:'edges'})),'none');
 assert.equal(V.transitionKind(v,{...v,presentation:{cursor:2}}),'none');
 assert.equal(V.transitionKind({...v,phase:'choice'},{...v,phase:'loss'}),'fade');
});
