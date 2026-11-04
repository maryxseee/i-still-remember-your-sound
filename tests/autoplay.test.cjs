const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const nodes=new Map(),players=[],timers=new Map();let timerId=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,listeners:{},textContent:'',src:'',addEventListener(e,fn){this.listeners[e]=fn;},replaceChildren(){},append(){},setAttribute(){},pause(){},play(){return Promise.resolve();}});return nodes.get(id);};
 const document={hidden:false,querySelector:node,createElement:()=>node('slot'),addEventListener(e,fn){if(e==='DOMContentLoaded')fn();},head:{append(){}}};
 const Player=function(slot,options){this.options=options;this.playCount=0;this.pauseCount=0;this.destroyed=false;this.playVideo=()=>this.playCount++;this.pauseVideo=()=>this.pauseCount++;this.destroy=()=>{this.destroyed=true;};this.setVolume=()=>{};this.mute=()=>{};this.unMute=()=>{};players.push(this);};
 const ctx={document,window:{YT:{Player},GameAudio:{settings:{music:.5,muted:false}}},location:{origin:'https://game.example'},Map,URL:{},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../src/music.js'),'utf8'),ctx);
 return {M:ctx.GameMusic,players,node,ctx};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('music starts on scene success without a separate music button and does not restart each dialogue',async()=>{
 const {M,players}=setup();M.unlock();M.scene('vinyl',false,false);await flush();assert.equal(players.length,0);
 M.scene('vinyl',true,false);await flush();assert.equal(players.length,1);
 players[0].options.events.onReady();assert.equal(players[0].playCount,1);
 M.scene('vinyl',true,false);await flush();assert.equal(players.length,1);assert.equal(players[0].playCount,1);
 M.scene('vinyl',true,true);assert.ok(players[0].destroyed);
 M.scene('vinyl',true,false);await flush();assert.equal(players.length,2);players[1].options.events.onReady();assert.equal(players[1].playCount,1);
 M.scene('tape',false,false);assert.ok(players[1].destroyed);
 M.scene('tape',true,false);await flush();assert.equal(players[2].options.videoId,'Yam5uK6e-bQ');
});
test('autoplay blocking reveals a recovery action and stale readiness never starts old music',async()=>{
 const {M,players,node}=setup();M.unlock();M.scene('cd',true,false);await flush();
 players[0].options.events.onAutoplayBlocked();assert.match(node('#music-message').textContent,/браузер/i);
 assert.equal(node('#enable-online').hidden,false);
 M.stop();players[0].options.events.onReady();assert.equal(players[0].playCount,0);
});
test('loss during slow API loading does not prevent music after restoration',async()=>{
 const {M,players,ctx}=setup(),YT=ctx.window.YT;delete ctx.window.YT;
 M.unlock();M.scene('vinyl',true,false);M.scene('vinyl',true,true);
 ctx.window.YT=YT;ctx.window.onYouTubeIframeAPIReady();await flush();assert.equal(players.length,0);
 M.scene('vinyl',true,false);await flush();assert.equal(players.length,1);
});
