const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add tflite to asset extensions so Metro bundles the model file
config.resolver.assetExts.push('tflite');

module.exports = config;
