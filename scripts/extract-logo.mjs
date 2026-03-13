/**
 * Extract base64 PNG from borsa-logo.svg, save as PNG, then create 180x180 webp.
 * Run: node scripts/extract-logo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'borsa-logo.svg');
const pngPath = path.join(root, 'public', 'borsa-logo.png');
const webpPath = path.join(root, 'public', 'borsa-logo.webp');

const svg = fs.readFileSync(svgPath, 'utf8');
const match = svg.match(/data:image\/png;base64,([^"]+)/) || svg.match(/data:img\/png;base64,([^"]+)/);
if (!match) {
  console.error('No base64 PNG found in SVG');
  process.exit(1);
}
const base64 = match[1];
const buffer = Buffer.from(base64, 'base64');
fs.writeFileSync(pngPath, buffer);
console.log('Wrote', pngPath);

const sharp = (await import('sharp')).default;
await sharp(buffer)
  .resize(180, 180)
  .webp({ quality: 85 })
  .toFile(webpPath);
const stat = fs.statSync(webpPath);
console.log('Wrote', webpPath, `(${(stat.size / 1024).toFixed(1)} KB)`);
