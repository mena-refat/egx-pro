const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const Module = require('module');

// Root node_modules has tailwindcss v4 (hoisted from web/admin), but nativewind
// requires v3. Redirect all tailwindcss requires to the mobile-local v3 install.
const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/')) {
    return _origResolve.call(this, request, parent, isMain, {
      ...(options || {}),
      paths: [__dirname],
    });
  }
  return _origResolve.call(this, request, parent, isMain, options);
};

const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
