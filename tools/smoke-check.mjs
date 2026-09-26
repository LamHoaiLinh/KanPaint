import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve(process.argv[2]||'dist');
const required=['index.html','kanpaint-v01.js','kanpaint-v01.css'];
for(const file of required){
  const full=path.join(dir,file);
  if(!fs.existsSync(full)) throw new Error('Missing build asset: '+file);
  if(fs.statSync(full).size<100) throw new Error('Build asset is unexpectedly small: '+file);
}
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'kanpaint-v01.js'),'utf8');
for(const token of ['KanPaint v0.1','kanpaint-v01.js','kanpaint-v01.css']){
  if(!html.includes(token)) throw new Error('index.html missing token: '+token);
}
for(const token of ['_kanPaintRetouch','_commitRetouchLayer','invertMask','showCompareSplit','Script Library','Export Layers','API_VERSION','Batch Runner','KanPaint Guide','Game Asset','installDropzoneSafety']){
  if(!js.includes(token)) throw new Error('v0.1 JS missing token: '+token);
}
console.log('KanPaint v0.1 smoke check passed.');

if(!html.includes("dropzone-overlay')?.classList.remove('visible')")) {
  throw new Error('Built app is missing canvas-drop overlay cleanup');
}
