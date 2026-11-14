const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const nodes=new Map(),timers=new Map(),events={};let count=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',src:'',paused:true,currentTime:0,volume:1,muted:false,loads:0,plays:0,listeners:{},addEventListener(e,f){this.listeners[e]=f;},setAttribute(){},load(){this.loads++;},pause(){this.paused=true;},play(){this.plays++;if(this.blocked){const err=new Error('gesture');err.name='NotAllowedError';return Promise.reject(err);}this.paused=false;return Promise.resolve();}});return nodes.get(id);};
 const document={hidden:false,querySelector:node,addEventListener(e,f){events[e]=f;}};
 const ctx={document,window:{GameAudio:{settings:{music:.5,muted:false}}},setTimeout(f){timers.set(++count,f);return count;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../src/music.js'),'utf8'),ctx);events.DOMContentLoaded();
 return {M:ctx.GameMusic,audio:node('#game-music'),node,ctx,events,runTimers(){const tasks=[...timers.values()];timers.clear();tasks.forEach(f=>f());}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('soundtrack is included on the same site with attribution and no YouTube dependency',()=>{
 const M=require('../src/music.js');
 for(const chapter of ['prologue','vinyl','tape','cd','finale']){
  const t=M.tracks[chapter];assert.match(t.file,/^assets\/audio\/[a-z-]+\.mp3$/);assert.equal(t.artist,'Scott Buckley');assert.equal(t.license,'CC BY 4.0');
  const file=path.join(__dirname,'..',t.file);assert.ok(fs.statSync(file).size>100000);assert.equal(fs.readFileSync(file).subarray(0,3).toString(),'ID3');
 }
});
test('first gesture starts music during opening dialogue and puzzle, repeated lines never restart it',async()=>{
 const {M,audio,node}=setup();M.scene('prologue',false,false);assert.equal(audio.plays,0);
 M.unlock();await flush();assert.equal(audio.plays,1);assert.equal(audio.paused,false);
 audio.listeners.playing();assert.match(node('#music-message').textContent,/Звучить/);
 audio.currentTime=43;M.scene('prologue',false,false);M.unlock();assert.equal(audio.plays,1);assert.equal(audio.currentTime,43);
});
test('chapter fades switch files, loss pauses and restore continues the same recording',async()=>{
 const {M,audio,runTimers}=setup();M.unlock();M.scene('vinyl',false,false);runTimers();await flush();
 assert.equal(audio.src,'assets/audio/golden-hour.mp3');audio.currentTime=24;
 M.scene('vinyl',true,false);assert.equal(audio.currentTime,24);
 M.scene('vinyl',true,true);runTimers();assert.equal(audio.paused,true);
 M.scene('vinyl',true,false);runTimers();await flush();assert.equal(audio.paused,false);assert.equal(audio.currentTime,24);
 M.scene('tape',false,false);runTimers();await flush();assert.equal(audio.src,'assets/audio/reverie.mp3');
});
test('rapid transitions cannot revive an old track, menu stays silent',async()=>{
 const {M,audio,runTimers}=setup();M.unlock();M.scene('vinyl',false,false);M.scene('tape',false,false);M.scene('cd',false,false);runTimers();await flush();
 assert.equal(audio.src,'assets/audio/childhood.mp3');
 M.scene('tape',false,false);M.stop();runTimers();await flush();assert.equal(audio.paused,true);
});
test('blocked playback reports reality, retries on next gesture, and mute does not reset progress',async()=>{
 const {M,audio,node,ctx}=setup();audio.blocked=true;M.scene('vinyl',false,false);M.unlock();await flush();
 assert.equal(node('#music-retry').hidden,false);assert.doesNotMatch(node('#music-message').textContent,/Звучить/);
 audio.blocked=false;M.unlock();await flush();assert.equal(audio.paused,false);
 audio.currentTime=31;ctx.window.GameAudio.settings.muted=true;M.apply();assert.equal(audio.muted,true);assert.equal(audio.currentTime,31);
});
test('background tab pauses and returns without resetting the song',async()=>{
 const {M,audio,ctx,events}=setup();M.scene('tape',false,false);M.unlock();await flush();audio.currentTime=71;
 ctx.document.hidden=true;events.visibilitychange();assert.equal(audio.paused,true);
 ctx.document.hidden=false;events.visibilitychange();await flush();assert.equal(audio.paused,false);assert.equal(audio.currentTime,71);
});
test('Web Audio fade pipeline restores element volume after silent main menu',async()=>{
 const {M,audio,ctx}=setup();
 const gain={value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}};
 ctx.window.AudioContext=class{constructor(){this.currentTime=0;this.destination={};}createGain(){return {gain,connect(){}};}createMediaElementSource(){return {connect(){}};}resume(){return Promise.resolve();}};
 M.stop();assert.equal(audio.volume,0);M.unlock();M.scene('prologue',false,false);await flush();
 assert.equal(audio.volume,1);assert.equal(audio.muted,false);assert.equal(gain.value,.5);
});
