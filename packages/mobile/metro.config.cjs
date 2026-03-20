const fs = require('fs');
const path = require('path');

// NativeWind requires Tailwind CSS v3.
// In this monorepo, `packages/web` and `packages/admin` use Tailwind v4 at the root level,
// while `packages/mobile` uses Tailwind v3. We ensure NativeWind resolves Tailwind v3 by
// creating a Windows-compatible junction under `node_modules/nativewind/node_modules`.
const srcTailwind = path.resolve(__dirname, 'node_modules', 'tailwindcss');
const dstTailwind = path.resolve(__dirname, '../../node_modules/nativewind/node_modules/tailwindcss');
const srcPkg = path.join(srcTailwind, 'package.json');
const dstPkg = path.join(dstTailwind, 'package.json');

if (!fs.existsSync(dstPkg) && fs.existsSync(srcPkg)) {
  fs.mkdirSync(path.dirname(dstTailwind), { recursive: true });
  // `junction` works better on Windows than symlinks.
  fs.symlinkSync(srcTailwind, dstTailwind, 'junction');
}

const { getDefaultConfig } = require('expo/metro-config');

// NativeWind is disabled for stability.
// Tailwind/NW `className` mappings can produce incorrect layout in this monorepo.
module.exports = getDefaultConfig(__dirname);
