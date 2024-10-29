const js = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');

module.exports = [
  js.configs.recommended,
  {
    ignores: ['test/fixture/**/.nuxt/*']
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        'node': true,
        '__dirname': true,
        'console': true
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['test/**/*.js'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
]; 