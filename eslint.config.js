const js = require('@eslint/js');
const globals = require('globals');

const rules = {
  'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-empty': ['error', { allowEmptyCatch: true }],
  'prefer-const': 'error',
  'no-var': 'error',
  eqeqeq: ['error', 'smart']
};

module.exports = [
  { ignores: ['node_modules/**', 'data/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['server.js', 'src/**/*.js', 'test/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } },
    rules
  }
];
