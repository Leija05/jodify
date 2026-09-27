const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs', 'mjs');
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@stores': path.resolve(__dirname, 'src/stores'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@lib': path.resolve(__dirname, 'src/lib'),
  '@theme': path.resolve(__dirname, 'src/theme'),
  '@context': path.resolve(__dirname, 'src/context'),
};

config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;