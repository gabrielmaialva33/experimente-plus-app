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
    // React Native's Android clipping crashes when a list's children change
    // during a scroll; every FlatList turns it off (src/components/list-clipping.ts).
    files: ['src/**/*.tsx'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.name='FlatList']:not(:has(JSXSpreadAttribute[argument.name='LIST_CLIPPING']))",
          message: 'Spread {...LIST_CLIPPING} from @/components/list-clipping on every FlatList.',
        },
      ],
    },
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
