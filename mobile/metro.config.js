// O modelo 3D vai como arquivo binário (.atlas) junto do app.
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('atlas');
module.exports = config;
