const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','styles.css','novel.css','characters.css','stage.css','memories.css','novel-v2.css','assets','src'])
 fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
// Ship presentation with the document: a partial mobile load must not leave a bare menu.
const version=require('../package.json').version;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>`<style data-source="${file}">${fs.readFileSync(path.join(root,file),'utf8')}</style>`).replace(/src="(src\/[^"?]+\.js)"/g,(_,file)=>`src="${file}?v=${version}"`);
fs.writeFileSync(path.join(dist,'index.html'),html);
fs.writeFileSync(path.join(dist,'_headers'),'/*\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: autoplay=(self "https://www.youtube.com")\n  X-Content-Type-Options: nosniff\n');
console.log('Web game prepared in dist/');
