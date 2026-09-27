import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const dir=path.resolve(process.argv[2]||'dist');
const required=['index.html','kanpaint-v01.js','kanpaint-v01.css'];
for(const file of required){
  const full=path.join(dir,file);
  if(!fs.existsSync(full)) throw new Error('Missing build asset: '+file);
  if(fs.statSync(full).size<100) throw new Error('Build asset is unexpectedly small: '+file);
}
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const cspMatch=html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)">/i);
if(!cspMatch) throw new Error('Missing Content-Security-Policy meta tag');
const cspHashes=new Set([...cspMatch[1].matchAll(/'sha256-([^']+)'/g)].map(match=>match[1]));
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
if(!inlineScripts.length) throw new Error('No inline scripts found for CSP verification');
for(const [index,script] of inlineScripts.entries()){
  const hash=createHash('sha256').update(script).digest('base64');
  if(!cspHashes.has(hash)) throw new Error(`CSP blocks inline script #${index+1}`);
}
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

const css=fs.readFileSync(path.join(dir,'kanpaint-v01.css'),'utf8');
for(const token of ['KanPaint 0.1 desktop toolbox usability fix','#flyout-host .audit-tool-flyout','--toolbar-w:156px']){
  if(!css.includes(token)) throw new Error('KanPaint toolbox CSS missing token: '+token);
}

for(const file of ['vendor/boot/fabric-7.4.0.min.js','vendor/boot/ag-psd-31.0.2.min.js','vendor/boot/jspdf-4.2.1.umd.min.js']){
  const full=path.join(dir,file);
  if(!fs.existsSync(full) || fs.statSync(full).size<10000) throw new Error('Missing vendored boot asset: '+file);
}
for(const token of ['./vendor/boot/fabric-7.4.0.min.js','./vendor/boot/ag-psd-31.0.2.min.js','./vendor/boot/jspdf-4.2.1.umd.min.js','Welcome to KanPaint']){
  if(!html.includes(token)) throw new Error('Built app missing local boot/branding token: '+token);
}
if(html.includes('https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js')) throw new Error('Fabric boot still depends on remote CDN');
for(const token of ['__KANPAINT_DISABLE_PWA__','kanpaint-sw-recovery-v01','./vendor/boot/fabric-7.4.0.min.js','./vendor/boot/ag-psd-31.0.2.min.js','./vendor/boot/jspdf-4.2.1.umd.min.js']){
  if(!html.includes(token)) throw new Error('KanPaint reliable-boot patch missing token: '+token);
}
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
if(!sw.includes("const SHELL_REVISION = '0.1.0-r4';")) throw new Error('KanPaint service-worker revision was not bumped');
for(const remote of [
  'https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js',
  'https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/dist/bundle.js',
  'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js'
]){
  if(sw.includes(remote)) throw new Error('Service worker still requires remote boot asset: '+remote);
}
const cssText=fs.readFileSync(path.join(dir,'kanpaint-v01.css'),'utf8');
if(!cssText.includes('KanPaint dark application chrome')) throw new Error('Dark top chrome CSS missing');
