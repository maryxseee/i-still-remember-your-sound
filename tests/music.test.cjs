const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/music.js');
test('each era uses the selected official recording',()=>{
 assert.equal(M.tracks.vinyl.title,'Fleetwood Mac — Dreams');
 assert.equal(M.tracks.tape.title,'The Cranberries — Dreams');
 assert.equal(M.tracks.cd.title,'Coldplay — Clocks');
 for(const track of Object.values(M.tracks))assert.match(track.video,/^[a-zA-Z0-9_-]{11}$/);
});
test('local recording returns with visible controls after loss and obeys mute',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const nodes=new Map();
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,listeners:{},textContent:'',src:'',playCount:0,pauseCount:0,addEventListener(event,fn){this.listeners[event]=fn;},replaceChildren(){},pause(){this.pauseCount++;},play(){this.playCount++;return Promise.resolve();}});
  return nodes.get(id);
 };
 const document={querySelector:node,addEventListener(event,fn){if(event==='DOMContentLoaded')fn();}};
 const context={document,window:{GameAudio:{settings:{music:.5,muted:false}}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Map,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/music.js'),'utf8'),context);
 const m=context.GameMusic;m.scene('vinyl',true,false);
 node('#music-file').listeners.change({target:{files:[{type:'audio/mpeg'}],value:'test'}});
 assert.equal(node('#local-music').hidden,false);
 m.scene('vinyl',true,true);assert.equal(node('#local-music').hidden,true);
 m.scene('vinyl',true,false);assert.equal(node('#local-music').hidden,false);
 assert.equal(node('#local-music').playCount,2);
 context.window.GameAudio.settings.muted=true;m.apply();assert.equal(node('#local-music').volume,0);
 m.scene('tape',false,false);assert.equal(node('#local-music').hidden,true);
 m.stop();assert.equal(node('#music-panel').hidden,true);
});
