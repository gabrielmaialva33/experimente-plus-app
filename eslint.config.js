// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettierRecommended = require('eslint-plugin-prettier/recommended')

module.exports = defineConfig([
  expoConfig,
  // Formatting is Prettier's (.prettierrc.json); `pnpm lint` reports what it would change.
  prettierRecommended,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'src/api/schema.d.ts'],
  },
  {
    // In test files, dynamic require() is idiomatic for jest.resetModules(),
    // jest.requireMock() and dynamic test fixture initialization.
    files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])
