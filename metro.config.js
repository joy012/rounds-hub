const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves packages correctly with pnpm (hoisted or symlinked)
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
