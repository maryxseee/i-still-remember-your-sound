const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js'), S=require('../src/story.js'), V=require('../src/visual.js');
test('borrowed identities explain who knows the heroine',()=>{
 assert.equal(S.chapters.tape.memory.name,'Меліса');
 assert.equal(S.chapters.cd.memory.relation,'старша сестра');
 for(const id of ['vinyl','tape','cd'])assert.ok(S.chapters[id].intro.includes(S.chapters[id].memory.name));
});
test('era wardrobe applies to all expressions and returns to modern clothes',()=>{
 for(const chapter of ['vinyl','tape','cd']){
  assert.equal(V.characterFile('heroine',{chapter,phase:'explore',step:0}),`heroine-${chapter}.png`);
  assert.equal(V.characterFile('heroine',{chapter,phase:'explore',feedback:'error'}),`heroine-${chapter}-sad.png`);
  assert.equal(V.characterFile('heroine',{chapter,phase:'choice'}),`heroine-${chapter}-happy.png`);
 }
 assert.equal(V.characterFile('heroine',{chapter:'finale',phase:'explore'}),'heroine.png');
});
test('album unlocks only completed memories and migrates legacy saves',()=>{
 let s=E.initialState();assert.deepEqual(E.photos(s),[]);
 s=E.reduce(s,{type:'enter'});
 for(const value of ['edges','clean','place','33','play'])s=E.reduce(s,{type:'vinyl',value});
 assert.deepEqual(E.photos(s),[]);
 s=E.reduce(s,{type:'choice',value:'side'});
 assert.deepEqual(E.photos(s),['vinyl']);
 s=E.reduce(s,{type:'restore'});
 assert.deepEqual(E.photos(E.parseSave(E.serialize(s))),['vinyl']);
 const legacy={...E.initialState(),chapter:'finale',choices:{vinyl:'side',tape:'letter',cd:'backup'}};
 assert.deepEqual(E.photos(E.parseSave(E.serialize(legacy))),['vinyl','tape','cd']);
});
test('all era expressions and group memories resolve to local assets',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const chapter of ['vinyl','tape','cd']){
  for(const s of [{phase:'explore',step:0},{phase:'explore',feedback:'error'},{phase:'choice'}])
   assert.ok(fs.existsSync(path.join(__dirname,'../assets/characters',V.characterFile('heroine',{chapter,...s}))));
  assert.ok(fs.existsSync(path.join(__dirname,`../assets/scenes/${chapter}-together.png`)));
  assert.equal(V.render({chapter,phase:'choice'},{social:true}),'');
 }
});
