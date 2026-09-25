import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const partsDir = path.join(root, 'src', 'parts');
const output = path.join(root, 'src', 'kanpaint-v02.js');

const parts = fs.readdirSync(partsDir)
  .filter(name => /^\d+\.part$/.test(name))
  .sort();

if (!parts.length) throw new Error('No KanPaint source parts found');

const source = parts.map(name => fs.readFileSync(path.join(partsDir, name), 'utf8')).join('');
fs.writeFileSync(output, source);
console.log(`Assembled ${parts.length} parts -> src/kanpaint-v02.js (${Buffer.byteLength(source)} bytes)`);
