const { getDefaultConfig } = require('expo/metro-config');

// NativeWind is disabled for stability.
// Tailwind/NW `className` mappings can produce incorrect layout in this monorepo.
module.exports = getDefaultConfig(__dirname);
