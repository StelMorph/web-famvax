// frontend/.eslintrc.js
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist/', 'build/', '*.config.*'],
  rules: {
    // project choices
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
  
    // allow empty (e.g., placeholder try/catch); still warns otherwise
    'no-empty': ['warn', { allowEmptyCatch: true }],
  
    // keep noise low for now; prefix unused with _ to silence cleanly
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
    ],
    'react-refresh/only-export-components': 'warn',
    'no-control-regex': 'off'
  },
};
