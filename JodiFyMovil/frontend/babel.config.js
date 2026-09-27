module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-module-resolver', {
        root: ['.'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@stores': './src/stores',
          '@services': './src/services',
          '@lib': './src/lib',
          '@theme': './src/theme',
          '@context': './src/context',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};