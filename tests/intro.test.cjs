const {test}=require('node:test'),assert=require('node:assert/strict');
const createIntro=require('../src/intro.js');
function setup(){
 const events={},listeners={},calls=[];
 const video={paused:true,currentTime:0,volume:1,muted:false,addEventListener(k,f){listeners[k]=f;},play(){this.paused=false;return this.blocked?Promise.reject(new Error('blocked')):Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}};
 const dialog={open:false,showModal(){this.open=true;},close(){this.open=false;listeners.close?.();},addEventListener(k,f){listeners[k]=f;}};
 const resume={hidden:true,focus(){}},skip={focus(){}},message={textContent:''};
 const document={hidden:false,addEventListener(k,f){events[k]=f;}};
 const intro=createIntro({video,dialog,resume,skip,message,document});
 return {intro,video,dialog,resume,message,listeners,events,document,calls};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('intro hands off once on end or skip and releases its media',async()=>{
 const s=setup();s.intro.play({music:.3,muted:false},()=>s.calls.push('story'));await flush();
 assert.equal(s.dialog.open,true);assert.equal(s.video.volume,.3);assert.equal(s.video.paused,false);
 s.listeners.ended();s.intro.finish();assert.deepEqual(s.calls,['story']);assert.equal(s.video.paused,true);assert.equal(s.dialog.open,false);
});
test('blocked autoplay stays recoverable by a direct user gesture',async()=>{
 const s=setup();s.video.blocked=true;s.intro.play({music:.5,muted:false},()=>{});await flush();
 assert.equal(s.resume.hidden,false);assert.match(s.message.textContent,/Продовжити/);
 s.video.blocked=false;s.intro.resume();await flush();assert.equal(s.resume.hidden,true);assert.equal(s.video.paused,false);
});
test('backgrounding pauses intro and offers resume without advancing the story',async()=>{
 const s=setup();s.intro.play({music:.5,muted:true},()=>s.calls.push('story'));await flush();assert.equal(s.video.muted,true);
 s.document.hidden=true;s.events.visibilitychange();assert.equal(s.video.paused,true);assert.equal(s.resume.hidden,false);
 s.document.hidden=false;s.events.visibilitychange();assert.equal(s.video.paused,true);assert.deepEqual(s.calls,[]);
 s.intro.finish();assert.deepEqual(s.calls,['story']);
});
test('failed media never traps the player and stale play rejection cannot affect the next screen',async()=>{
 const s=setup();s.video.blocked=true;s.intro.play({music:.5,muted:false},()=>s.calls.push('story'));s.listeners.error();await flush();
 assert.deepEqual(s.calls,['story']);assert.equal(s.dialog.open,false);assert.equal(s.resume.hidden,true);
});
