const path = require('path')

// Jest resolves through React Native's resolver, inherited from the jest-expo
// preset. Worklets, which Reanimated runs on, ships a native build that needs
// the JSI runtime; under Jest it must resolve to its JavaScript build, so its
// `.native` files are skipped — the filter of react-native-worklets/jest/resolver.js,
// composed with the preset's resolver. The match is on the package directory:
// pnpm also names worklets in the store paths of packages that merely peer on it.
const presetResolver = require(require('jest-expo/jest-preset').resolver)
const worklets = `${path.sep}node_modules${path.sep}react-native-worklets${path.sep}`

module.exports = (request, options) => {
  const inWorklets = request === 'react-native-worklets' || request.startsWith('react-native-worklets/') ||
    `${options.basedir}${path.sep}`.includes(worklets)
  return presetResolver(
    request,
    inWorklets ? { ...options, extensions: options.extensions?.filter((extension) => !extension.includes('native')) } : options
  )
}
