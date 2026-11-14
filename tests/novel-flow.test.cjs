const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),F=require('../src/flow.js'),S=require('../src/story.js'),V=require('../src/visual.js');
test('every narrative branch supplies bounded readable beats and distinct absence scenes',()=>{
 for(const chapter of ['vinyl','tape','cd'])for(const outcome of [true,false]){
  const s={...E.initialState(),chapter,outcomes:{[chapter]:outcome}};
  for(const phase of ['intro','result','absence','closure']){const beats=F.sequence({...s,phase},S);assert.ok(beats.length>=4);for(const b of beats){assert.ok(b.text.length<=280);assert.ok(b.speaker);}}
  const actual=F.scene({...s,phase:'result'}),absent=F.scene({...s,phase:'absence'});assert.notEqual(actual.image,absent.image);assert.equal(absent.silent,true);assert.equal(absent.hideCast,true);
 }
});
test('eight ending scenes and personalised text cannot change the earned ending',()=>{
 for(const id of E.endings){const s={...E.initialState(),chapter:'finale',phase:'ended',ending:id};assert.equal(F.scene(s).image,`ending-${id}`);assert.ok(F.sequence(s,S).length>=6);s.song={title:'<script>test</script>',memory:'Наш вечір'};assert.match(F.personalClosing(s,S),/Наш вечір/);assert.equal(s.ending,id);}
});
test('era outfits and device states remain available independently from room art',()=>{
 for(const chapter of ['vinyl','tape','cd']){const s={...E.initialState(),chapter,phase:'puzzle'};assert.equal(V.characterFile('heroine',s),`heroine-${chapter}.png`);assert.match(V.mechanism(s),/<svg/);assert.doesNotMatch(V.render(s),/<svg/);}
});
test('restored dialogue cursors cannot strand a player beyond the script',()=>{
 const s={...E.initialState(),cursor:199};const fixed=F.restore(s,S);assert.equal(fixed.cursor,F.sequence(s,S).length-1);assert.equal(E.reduce(fixed,{type:'next',length:F.sequence(fixed,S).length}).phase,'explore');
 const ended={...s,chapter:'finale',phase:'ended',ending:'111'};assert.equal(F.restore(ended,S).cursor,F.sequence(ended,S).length);
 assert.equal(F.restore(null,S),null);
});
test('damaged originals do not animate as playing and a memory needs no song title',()=>{
 for(const chapter of ['vinyl','tape']){const s={...E.initialState(),chapter,phase:'result',step:chapter==='vinyl'?4:1};assert.equal(V.describe(s,{stopped:true}).playing,false);assert.equal(V.describe(s,{stopped:true}).spinning,false);}
 const s={...E.initialState(),ending:'000',song:{title:'',memory:'Наш дощовий вечір'}};assert.match(F.personalClosing(s,S),/Наш дощовий вечір/);
});
test('all story illustrations and era expressions exist in the shipped source',()=>{
 const fs=require('node:fs'),path=require('node:path');const asset=file=>assert.ok(fs.existsSync(path.join(__dirname,'../assets',file)),file);
 for(const key of E.endings)asset(`scenes/ending-${key}.png`);
 for(const chapter of ['vinyl','tape','cd']){asset(`scenes/${chapter}-absence.png`);asset(`scenes/${chapter}-together.png`);for(const mood of ['', '-sad','-happy'])asset(`characters/heroine-${chapter}${mood}.png`);}
 asset('characters/marko.png');
});
