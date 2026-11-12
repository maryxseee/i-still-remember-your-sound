(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameInspection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const point=(object,label,x,y)=>({object,label,x,y});
const areas={
 prologue:{title:'Сімейна коробка',button:'Оглянути коробку',image:'04-family-box-closeup.png',x:76,y:62,points:[{action:'enter',label:'Платівка · почати зі сторони А',x:26,y:62},point('note','Записка',54,38),point('box','Касети й фотографії',52,74),point('box','Три CD',79,65)]},
 vinyl:{title:'Стіл Джессіки',button:'Оглянути стіл із платівкою',image:'05-vinyl-table-closeup.png',x:78,y:68,points:[point('sleeve','Конверт',37,34),point('invitation','Запрошення',15,49),point('record','Платівка',73,35),point('turntable','Програвач',88,57),point('turntable','Книжечка й щітка',26,74)]},
 tape:{title:'Перед від’їздом',button:'Оглянути касетний стіл',image:'06-tape-table-closeup.png',x:77,y:68,points:[point('player','Магнітофон',53,22),point('cassette','Дві касети',50,56),point('letter','Лист Мелісі',22,65),point('list','Картки спогадів',73,59)]},
 cd:{title:'Архів першого концерту',button:'Оглянути стіл із дисками',image:'07-cd-desk-closeup.png',x:76,y:62,points:[point('computer','Комп’ютер',38,29),point('player','CD-програвач',78,35),point('discs','Три диски',58,66),point('catalog','Блокнот концерту',19,78)]}
};
const papers={note:{image:'08-prologue-note.png',layout:'sheet'},book:{image:'09-vinyl-booklet.png',layout:'book'},letter:{image:'10-tape-letter.png',layout:'sheet'},notebook:{image:'11-cd-concert-notebook.png',layout:'book'}};
function paper(chapter,object){return papers[chapter==='vinyl'?(object==='invitation'?'note':'book'):chapter==='tape'?'letter':chapter==='cd'?'notebook':'note'];}
function photo(chapter){return `assets/scenes/${chapter}-together-v2.png`;}
function pages(text){const sentences=String(text).match(/[^.!?]+[.!?]+[»”"]?|[^.!?]+$/g).map(t=>t.trim()).filter(Boolean);if(sentences.length<2){const cut=text.lastIndexOf(' ',Math.ceil(text.length/2));return text.length>120&&cut>0?[[text.slice(0,cut)],[text.slice(cut+1)]]:[sentences,[]];}let best=1,distance=Infinity;for(let i=1;i<sentences.length;i++){const d=Math.abs(sentences.slice(0,i).join(' ').length-(text.length-30)/2);if(d<distance){best=i;distance=d;}}return [sentences.slice(0,best),sentences.slice(best)];}
return {areas,papers,paper,photo,pages};
});
