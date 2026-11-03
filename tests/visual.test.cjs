const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine.js');
const p = path.join(__dirname, '../src/visual.js');
const V = fs.existsSync(p) ? require(p) : {};
const act = (s,type,value) => E.reduce(s,{type,value});
test('every successful vinyl action changes the visible mechanism, wrong action does not advance it',()=>{
 let s=act(E.initialState(),'enter');
 assert.equal(V.describe(s).record,'sleeve');
 const wrong=act(s,'vinyl','surface');
 assert.equal(V.describe(wrong).record,'sleeve');
 assert.equal(V.describe(wrong).error,true);
 s=act(s,'vinyl','edges');assert.equal(V.describe(s).record,'held');assert.equal(V.describe(s).dust,true);
 s=act(s,'vinyl','clean');assert.equal(V.describe(s).dust,false);assert.equal(V.describe(s).record,'held');
 s=act(s,'vinyl','place');assert.equal(V.describe(s).record,'platter');assert.equal(V.describe(s).speed,'45');
 s=act(s,'vinyl','33');assert.equal(V.describe(s).speed,'33⅓');assert.equal(V.describe(s).spinning,false);
 s=act(s,'vinyl','play');assert.equal(V.describe(s).spinning,true);assert.equal(V.describe(s).arm,'down');
});
test('loss removes the medium, reduced-motion still retains the correct final state',()=>{
 let s=act(E.initialState(),'enter');for(const value of ['edges','clean','place','33','play'])s=act(s,'vinyl',value);
 s=act(s,'choice','song');
 const v=V.describe(s,{lost:true,reducedMotion:true});assert.equal(v.record,'missing');assert.equal(v.spinning,false);
 const restored=V.describe(s,{lost:false,reducedMotion:true});assert.equal(restored.record,'platter');assert.equal(restored.arm,'down');
});
test('box exploration, cassette order, disc choice and endings each produce distinct visible states',()=>{
 let s=E.initialState();assert.equal(V.describe(s).boxOpen,false);
 s=act(s,'inspect','box');assert.equal(V.describe(s).boxOpen,true);
 const tape={...s,chapter:'tape'};assert.deepEqual(V.describe(tape,{order:['road','meeting','unsaid']}).order,['road','meeting','unsaid']);
 const cd={...s,chapter:'cd'};assert.equal(V.describe(cd,{disc:'mp3',discStage:'device'}).disc,'mp3');assert.equal(V.describe(cd,{disc:'audio',discStage:'device'}).disc,'audio');
 assert.notEqual(V.describe({...s,chapter:'finale',phase:'ended',ending:'home'}).ending,V.describe({...s,chapter:'finale',phase:'ended',ending:'archive'}).ending);
});
test('restored successful media never revert to unsolved order or the wrong album',()=>{
 const tape={...E.initialState(),chapter:'tape',phase:'choice',choices:{vinyl:'side'}};
 assert.deepEqual(V.describe(tape,{order:['meeting','unsaid','road']}).order,['road','meeting','unsaid']);
 const cd={...E.initialState(),chapter:'cd',choices:{vinyl:'side',tape:'letter'}};
 const solved=act(cd,'disc',['mp3','computer']);
 const restored=E.parseSave(E.serialize(solved));
 assert.ok(restored);
 assert.equal(V.describe(restored,{disc:'other',device:'player'}).disc,'mp3');
 assert.equal(V.describe(restored,{disc:'other',device:'player'}).device,'computer');
 const legacy={...solved};delete legacy.media;
 assert.equal(V.describe(E.parseSave(E.serialize(legacy)),{disc:'other'}).disc,'audio');
});
