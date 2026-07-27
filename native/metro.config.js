// Minimal Metro tweak for the Firebase JS SDK: some of its files ship as .cjs.
// NOTE: do NOT set `unstable_enablePackageExports = false` here (the old
// Firebase workaround) — on Expo SDK 57 it breaks expo-router's own deps
// (@radix-ui subpath exports only resolve via package exports).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
