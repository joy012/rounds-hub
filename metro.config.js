const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves packages correctly with pnpm (hoisted or symlinked)
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
  // Explicit resolution for native modules that Metro may fail to resolve (e.g. on Android)
  extraNodeModules: {
    '@react-native-community/datetimepicker': path.resolve(
      __dirname,
      'node_modules/@react-native-community/datetimepicker'
    ),
  },
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
