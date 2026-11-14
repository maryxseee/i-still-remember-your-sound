const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/flow.js'),V=require('../src/visual.js'),E=require('../src/engine.js'),S=require('../src/story.js');
test('one dialogue activation rejects double clicks and rapid duplicate touch/keyboard events',()=>{
 const allow=F.advanceGate();assert.equal(allow(1000,1),true);assert.equal(allow(1050,2),false);assert.equal(allow(1100,0),false);assert.equal(allow(1400,1),true);assert.equal(allow(1450,3),false);assert.equal(allow(1800,0),true);
});
test('Marko occupies the guest slot while heroine remains separate',()=>{
 const html=V.render({...E.initialState(),chapter:'vinyl'},{speaker:'Марко'});assert.match(html,/character-marko character-guest/);assert.doesNotMatch(html,/character-rebecca/);assert.match(html,/character-heroine/);
});
test('unknown voices have question marks and family avatars are distinct after the reveal',()=>{
 const early=E.initialState();assert.match(V.avatar('Голос із кухні',early),/avatar-unknown/);
 for(const name of ['Лідія','Меліса','Софія']){assert.match(V.avatar(name,early),/avatar-unknown/);assert.doesNotMatch(V.avatar(name,{...early,chapter:'finale'}),/heroine/);assert.match(V.avatar(name,{...early,chapter:'finale'}),/avatar-portrait/);}
});
test('absence imagines music never existing rather than only a missing archive',()=>{
 const a=id=>S.chapters[id].absence.map(b=>b.text).join(' ');
 assert.match(a('vinyl'),/не було.*платівки|платівки.*не було|платівки.*не існувало/);assert.match(a('vinyl'),/не зустрі/);
 assert.match(a('tape'),/не.*познайом|не.*зустрі/);
 assert.match(a('cd'),/медич|лікар/);assert.match(a('cd'),/не.*Анжел/);
 assert.doesNotMatch(JSON.stringify(S.chapters),/Два друзі/);
});
test('family identity is revealed in the epilogue and new portrait assets exist',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const id of ['vinyl','tape','cd'])assert.doesNotMatch(S.chapters[id].intro.map(b=>b.text).join(' '),/твоя бабуся|твоя мама|старшу сестру/);
 assert.match(S.chapters.finale.intro.map(b=>b.text).join(' '),/Лідія — твоя бабуся.*Меліса — мама.*Софія — старша сестра/);
 for(const name of ['lidiya','melissa','sofia'])assert.ok(fs.existsSync(path.join(__dirname,`../assets/characters/${name}-avatar.png`)));
 assert.ok(fs.existsSync(path.join(__dirname,'../assets/scenes/cd-absence-v2.png')));
});
