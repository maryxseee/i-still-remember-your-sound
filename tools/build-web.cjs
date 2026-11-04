const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','styles.css','novel.css','characters.css','stage.css','memories.css','assets','src'])
 fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
fs.writeFileSync(path.join(dist,'_headers'),'/*\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: autoplay=(self "https://www.youtube.com")\n  X-Content-Type-Options: nosniff\n');
console.log('Web game prepared in dist/');
