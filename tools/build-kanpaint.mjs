import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const upstream = path.resolve(process.argv[2] || path.join(root, 'upstream'));
const out = path.resolve(process.argv[3] || path.join(root, 'dist'));

if (!fs.existsSync(path.join(upstream, 'index.html'))) {
  throw new Error(`OpenShop source not found at ${upstream}. Pass the upstream folder as the first argument.`);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(upstream, out, {
  recursive: true,
  filter(source) {
    const base = path.basename(source);
    return base !== '.git' && base !== 'node_modules' && base !== 'dist';
  },
});

const read = rel => fs.readFileSync(path.join(out, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(out, rel), value);
const mustReplace = (value, search, replacement, label) => {
  if (!value.includes(search)) throw new Error(`Could not patch ${label}`);
  return value.replace(search, replacement);
};

const BOOT_VENDOR_ASSETS = [
  {
    name:'Fabric.js',
    url:'https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js',
    integrity:'sha384-T2IWa4YW4tn/gJpR880CrMehXQvwxwaRgQszdzYPA6jBbKH9sPZuTf9YrN/PqNP6',
    file:'fabric-7.4.0.min.js'
  },
  {
    name:'ag-psd',
    url:'https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/dist/bundle.js',
    integrity:'sha384-9dhx2Gx3cKvCuBJwLZxPUmqz77LqKJIAzYABzUhCaCPDK5Rz+CFt6/jeKu84tBA6',
    file:'ag-psd-31.0.2.min.js'
  },
  {
    name:'jsPDF',
    url:'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
    integrity:'sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3',
    file:'jspdf-4.2.1.umd.min.js'
  }
];

const vendorBootAssets = async () => {
  const dir=path.join(out,'vendor','boot');
  fs.mkdirSync(dir,{recursive:true});
  for(const asset of BOOT_VENDOR_ASSETS){
    const response=await fetch(asset.url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error(`Could not vendor ${asset.name}: HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    const sri='sha384-'+createHash('sha384').update(bytes).digest('base64');
    if(sri!==asset.integrity) throw new Error(`Integrity mismatch while vendoring ${asset.name}`);
    fs.writeFileSync(path.join(dir,asset.file),bytes);
  }
};
await vendorBootAssets();

let html = read('index.html');
html = mustReplace(html,
  '<meta name="description" content="OpenShop is a private browser image editor with layers, selections, PSD interchange, local export, and an installable offline shell.">',
  '<meta name="description" content="KanPaint is a browser image editor with layers, selections, PSD interchange, layer export, scripts, and skin retouch tools.">',
  'description');
html = mustReplace(html, '<meta property="og:title" content="OpenShop | Private Browser Image Editor">', '<meta property="og:title" content="KanPaint | Browser Image Editor">', 'og title');
html = mustReplace(html, '<meta property="og:site_name" content="OpenShop">', '<meta property="og:site_name" content="KanPaint">', 'og site');
html = mustReplace(html, '<meta property="og:url" content="https://sysadmindoc.github.io/Openshop/">', '<meta property="og:url" content="https://lamhoailinh.github.io/KanPaint/">', 'og url');
html = mustReplace(html, '<meta name="twitter:title" content="OpenShop | Private Browser Image Editor">', '<meta name="twitter:title" content="KanPaint | Browser Image Editor">', 'twitter title');
html = mustReplace(html, '<title>OpenShop v0.31.0 | Browser Image Editor</title>', '<title>KanPaint v0.1 | Browser Image Editor</title>', 'title');
html = mustReplace(html,
  'https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js',
  './vendor/boot/fabric-7.4.0.min.js',
  'boot asset Fabric.js URL');
html = mustReplace(html,
  'https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/dist/bundle.js',
  './vendor/boot/ag-psd-31.0.2.min.js',
  'boot asset ag-psd URL');
html = mustReplace(html,
  'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
  './vendor/boot/jspdf-4.2.1.umd.min.js',
  'boot asset jsPDF URL');
html = mustReplace(html,
  '<div id="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to OpenShop">',
  '<div id="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to KanPaint">',
  'welcome aria branding');
html = mustReplace(html,
  '<div class="welcome-brand"><span class="welcome-mark">OS</span><span>OpenShop</span><small>v0.31</small></div>',
  '<div class="welcome-brand"><span class="welcome-mark">KP</span><span>KanPaint</span><small>v0.1</small></div>',
  'welcome branding');
html = mustReplace(
  html,
  "ca.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); this.handleDrop(e); });",
  "ca.addEventListener('drop', e => { e.preventDefault(); document.getElementById('dropzone-overlay')?.classList.remove('visible'); e.stopPropagation(); void this.handleDrop(e); });",
  'drop overlay cleanup'
);
html = mustReplace(html, '</title>\n<script>', '</title>\n<link rel="stylesheet" href="./kanpaint-v01.css">\n<script>', 'extension stylesheet');
html = mustReplace(html,
`    <div class="logo" aria-label="OpenShop version 0.31.0">
        <span class="logo-mark">OS</span>
        <span class="logo-word">OpenShop</span>
        <span class="logo-version">v0.31</span>
    </div>`,
`    <div class="logo" aria-label="KanPaint version 0.1">
        <span class="logo-mark">KP</span>
        <span class="logo-word">KanPaint</span>
        <span class="logo-version">v0.1</span>
    </div>`,
  'logo');
html = mustReplace(html, '</script>\n</body>\n</html>', '</script>\n<script src="./kanpaint-v01.js"></script>\n</body>\n</html>', 'extension script');
write('index.html', html);

const srcDir = path.join(root, 'src');
fs.copyFileSync(path.join(srcDir, 'kanpaint-v01.js'), path.join(out, 'kanpaint-v01.js'));
fs.copyFileSync(path.join(srcDir, 'kanpaint-v01.css'), path.join(out, 'kanpaint-v01.css'));

const packagePath = path.join(out, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.name = 'kanpaint';
  pkg.version = '0.1.0';
  pkg.description = 'Browser image editor based on OpenShop with layer export, sandboxed scripts, and skin retouch tools';
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const manifestPath = path.join(out, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = 'KanPaint Image Editor';
  manifest.short_name = 'KanPaint';
  manifest.version = '0.1.0';
  manifest.description = 'Browser image editing with layers, export-layers, sandboxed scripts, PSD interchange, and skin retouch.';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const runtimePath = path.join(out, 'tools', 'runtime-assets.mjs');
if (fs.existsSync(runtimePath)) {
  let runtime = fs.readFileSync(runtimePath, 'utf8');
  const anchor = "  './plugin-sandbox.js',\n";
  if (!runtime.includes("'./kanpaint-v01.js'")) {
    runtime = mustReplace(runtime, anchor, `${anchor}  './kanpaint-v01.js',\n  './kanpaint-v01.css',\n`, 'runtime asset list');
  }
  fs.writeFileSync(runtimePath, runtime);
}

const swPath = path.join(out, 'sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = mustReplace(sw, "const SHELL_REVISION = '0.31.0-r1';", "const SHELL_REVISION = '0.1.0-r3';", 'service worker revision');
  const revAnchor = "    SHELL_REVISION,\n";
  if (!sw.includes("    '0.31.0-r1',"))
    sw = mustReplace(sw, revAnchor, `${revAnchor}    '0.31.0-r1',\n    '0.1.0-r1',\n`, 'rollback revision');
  const assetAnchor = '    "./index.html",\n';
  if (!sw.includes('"./kanpaint-v01.js"'))
    sw = mustReplace(sw, assetAnchor, `${assetAnchor}    "./kanpaint-v01.js",\n    "./kanpaint-v01.css",\n`, 'service worker assets');
  if (!sw.includes('"./vendor/boot/fabric-7.4.0.min.js"'))
    sw = mustReplace(sw, assetAnchor, `${assetAnchor}    "./vendor/boot/fabric-7.4.0.min.js",\n    "./vendor/boot/ag-psd-31.0.2.min.js",\n    "./vendor/boot/jspdf-4.2.1.umd.min.js",\n`, 'service worker boot vendor assets');
  fs.writeFileSync(swPath, sw);
}

fs.writeFileSync(path.join(out, 'KANPAINT_BUILD.txt'), [
  'KanPaint v0.1.0',
  'Based on OpenShop 0.31.0',
  'KanPaint extensions: Export Layers + Auto Trim, sandboxed Scripts + Script Library, Skin Retouch.',
  'Boot libraries: same-origin vendored Fabric.js, ag-psd and jsPDF for fast reliable startup.',
  'See repository NOTICE.md and upstream LICENSE.',
  '',
].join('\n'));

console.log(`KanPaint v0.1 built at ${out}`);
