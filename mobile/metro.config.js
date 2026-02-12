const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '..');

config.watchFolders = [path.join(workspaceRoot, 'src')];
config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(workspaceRoot, 'node_modules')
];

module.exports = config;
