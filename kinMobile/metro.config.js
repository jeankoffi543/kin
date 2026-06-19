const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

const config = {
  resolver: {
    // react-native-quick-crypto requires these Node.js polyfills
    extraNodeModules: {
      crypto: require.resolve('react-native-quick-crypto'),
      stream: require.resolve('readable-stream'),
      buffer: require.resolve('@craftzdog/react-native-buffer'),
    },
  },
  watchFolders: [path.resolve(__dirname, 'src')],
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
