const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const V=require('../src/visual.js'),E=require('../src/engine.js'),F=require('../src/flow.js');
const I=require('../src/inspection.js'),S=require('../src/story.js');
test('question marks end when each memory opening ends, including Melissa in absence and closure',()=>{
 for(const chapter of ['vinyl','tape','cd','finale'])for(const phase of ['explore','puzzle','result','absence','closure','ended'])for(const name of ['Лідія','Меліса','Софія','Голос із кухні']){
  const html=V.avatar(name,{...E.initialState(),chapter,phase});assert.doesNotMatch(html,/avatar-unknown/);assert.match(html,/avatar-portrait/);
 }
});
test('all three actual memory scenes use corrected cast illustrations',()=>{
 for(const chapter of ['vinyl','tape','cd'])for(const phase of ['result','closure'])assert.equal(F.scene({chapter,phase}).image,`${chapter}-together-v2`);
});
test('all exploration targets lead to real story objects or the side-A entrance',()=>{
 for(const [chapter,area] of Object.entries(I.areas)){
  assert.ok(fs.existsSync(path.join(__dirname,'../assets/inspection',area.image)));
  for(const point of area.points){assert.ok(point.x>0&&point.x<100&&point.y>0&&point.y<100);assert.ok(point.label);if(point.object)assert.ok(S.chapters[chapter].objects.some(o=>o.id===point.object));else assert.equal(point.action,'enter');}
  if(chapter!=='prologue')for(const o of S.chapters[chapter].objects)assert.ok(area.points.some(p=>p.object===o.id),o.id);
 }
});
test('paper clues and album reference all approved illustrations',()=>{
 for(const paper of Object.values(I.papers)){assert.ok(['sheet','book'].includes(paper.layout));assert.ok(fs.existsSync(path.join(__dirname,'../assets/inspection',paper.image)));}
 for(const chapter of ['vinyl','tape','cd'])assert.ok(fs.existsSync(path.join(__dirname,'..',I.photo(chapter))));
 assert.equal(I.paper('vinyl','invitation'),I.papers.note);assert.equal(I.paper('tape','letter'),I.papers.letter);assert.equal(I.paper('cd','catalog'),I.papers.notebook);
});
test('book pages preserve every word and prefer sentence boundaries',()=>{
 for(const chapter of ['vinyl','tape','cd'])for(const o of S.chapters[chapter].objects){assert.equal(I.pages(o.text).flat().join(' ').replace(/\s+/g,' '),o.text.replace(/\s+/g,' '));}
 const pages=I.pages(S.chapters.cd.objects.find(o=>o.id==='catalog').text);assert.ok(pages[0].join(' ').length>50);assert.ok(pages[1].join(' ').length>50);assert.match(pages[0].at(-1),/[.!?»”]$/);
});
