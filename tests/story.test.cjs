const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const S=require('../src/story.js');
const core=['vinyl','tape','cd'];
const keys=['000','001','010','011','100','101','110','111'];
function checkBeats(rows,min,max,label){
  assert.ok(Array.isArray(rows),label);
  assert.ok(rows.length>=min&&rows.length<=max,`${label}: ${rows.length}`);
  for(const b of rows){assert.equal(typeof b.speaker,'string');assert.ok(b.speaker.length);assert.equal(typeof b.text,'string');assert.ok(b.text.trim().length>0);assert.ok(b.text.length<=260,`${label}: ${b.text.length} ${b.text}`);}
}
test('UMD provides the same usable data in a plain browser',()=>{
  const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/story.js'),'utf8'),context);
  assert.deepEqual(Object.keys(context.GameStory.chapters),Object.keys(S.chapters));
  assert.equal(context.GameStory.endings['111'].scene,'ending-111');
});
test('all chapters have ordered readable beats and stable exploration objects',()=>{
  const ids={prologue:['phone','headphones','box','note'],vinyl:['sleeve','invitation','record','turntable'],tape:['cassette','player','letter','list'],cd:['discs','computer','player','catalog'],finale:['collection','journal']};
  for(const [id,objects] of Object.entries(ids)){
    const c=S.chapters[id];checkBeats(c.intro,id==='prologue'?10:id==='finale'?8:15,22,id);
    assert.deepEqual(c.objects.map(o=>o.id),objects);
    assert.equal(c.hints.length,3);assert.ok(new Set(c.hints).size===3);
    for(const o of c.objects){assert.ok(o.label&&o.text.length>35);assert.ok(o.x>=0&&o.x<=100&&o.y>=0&&o.y<=100);}
    for(const key of ['number','era','title','person','task']) assert.ok(c[key],`${id}.${key}`);
  }
});
test('consequences distinguish actual saved and lost audio from hypothetical absence',()=>{
  for(const id of core){const c=S.chapters[id];
    for(const field of ['name','relation','year','title','caption']) assert.ok(c.memory[field]);
    for(const outcome of ['saved','lost']){checkBeats(c.result[outcome],8,12,id+' result '+outcome);checkBeats(c.closure[outcome],4,6,id+' closure '+outcome);}
    checkBeats(c.absence,4,6,id+' absence');
    assert.match(c.absence.map(b=>b.text).join(' '),/уяв|можлив/i);
    assert.notDeepEqual(c.result.saved,c.result.lost);assert.notDeepEqual(c.closure.saved,c.closure.lost);
  }
  assert.match(S.chapters.vinyl.result.lost.map(b=>b.text).join(' '),/запасна|інша платівка/);
  assert.match(S.chapters.tape.result.lost.map(b=>b.text).join(' '),/перезаписан/);
  assert.match(S.chapters.cd.closure.lost.map(b=>b.text).join(' '),/повного концерту тут немає/);
});
test('puzzles are justified by inspectable evidence, not answer lines in main dialogue',()=>{
  const texts=id=>S.chapters[id].objects.map(o=>o.text).join(' ');
  assert.match(texts('vinyl'),/33⅓/);assert.match(texts('vinyl'),/край|краї/);assert.match(texts('vinyl'),/щіт/);
  const tape=texts('tape');assert.match(tape,/A.*Оригінал/);assert.match(tape,/B.*Чиста/);assert.match(tape,/A→B/);assert.match(tape,/стирає/);
  assert.ok(tape.indexOf('Спершу')<tape.indexOf('Потім'));assert.match(tape,/Уже вдома/);
  const cd=texts('cd');for(const clue of ['Мідний диск · «Вечір»','Срібний диск · «14-05»','Синій диск · без назви','17:40','23:18','04:12','12 номерів','14 травня 2004','Для тих, хто сьогодні тут','MP3','Audio CD'])assert.ok(cd.includes(clue),clue);
  assert.match(S.chapters.cd.objects.find(o=>o.id==='player').text,/не читає.*MP3/);
  assert.doesNotMatch(texts('cd'),/demo|concert|incomplete/);
  assert.match(S.chapters.cd.hints[2],/Срібний диск/);
  assert.match(S.chapters.cd.result.saved.find(b=>b.text.includes('хочу працювати зі звуком')).speaker,/Ти/);
  assert.match(S.chapters.cd.objects.find(o=>o.id==='catalog').text,/Анжела починає словами/);
  assert.equal(S.chapters.cd.result.saved.find(b=>b.text==='Для тих, хто сьогодні тут.').speaker,'Запис Анжели');
  for(const id of core){const intro=S.chapters[id].intro.map(b=>b.text).join(' ');assert.doesNotMatch(intro,/33⅓|A→B|23:18/);}
});
test('eight automatic outcome endings have distinct scenes, dialogue and consequences',()=>{
  assert.deepEqual(Object.keys(S.endings).sort(),keys);
  for(const key of keys){const e=S.endings[key];assert.equal(e.scene,'ending-'+key);for(const field of ['title','mood','caption','closing'])assert.ok(e[field]);checkBeats(e.beats,8,12,key);}
  for(const field of ['title','scene','closing'])assert.equal(new Set(Object.values(S.endings).map(e=>e[field])).size,8);
  assert.match(S.endings['000'].beats.map(b=>b.text).join(' '),/Лука|носіями/);
  assert.match(S.chapters.finale.intro.map(b=>b.text).join(' '),/З’єднання відновлено/);
  assert.doesNotMatch(JSON.stringify(S.endings),/«Відтворити»|запускається твоя пісня/);
});
test('journal reports only resolved boolean outcomes and accurately keeps three photos',()=>{
  assert.deepEqual(S.journal({}),[]);assert.deepEqual(S.journal({vinyl:'side',tape:'copy',cd:'catalog'}),[]);
  for(const key of keys){const outcomes=Object.fromEntries(core.map((id,i)=>[id,key[i]==='1']));const rows=S.journal(outcomes);assert.equal(rows.length,3);for(let i=0;i<3;i++){assert.equal(rows[i].title,S.chapters[core[i]].title);assert.match(rows[i].text,/Фото|фото/);assert.notEqual(rows[i].text,S.journal({...outcomes,[core[i]]:!outcomes[core[i]]})[i].text);}}
});


test('ending scenes preserve approved illustration staging and Sofia vocation',()=>{
 const e10=S.endings['010'];assert.match(e10.caption,/лавці.*зупинки/);assert.match(e10.beats.map(b=>b.text).join(' '),/дротовий навушник/);
 const e11=S.endings['011'];const reunion=e11.beats.slice(e11.beats.findIndex(b=>b.text.includes('Наступної суботи')));assert.ok(reunion.every(b=>b.speaker!=='Лідія'));
 assert.match(S.endings['001'].beats.map(b=>b.text).join(' '),/працювати зі звуком/);
 assert.match(S.endings['101'].beats.map(b=>b.text).join(' '),/ручку гучності/);
});
