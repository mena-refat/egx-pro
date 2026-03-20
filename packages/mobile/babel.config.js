module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'borsa-mobile/lib' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
