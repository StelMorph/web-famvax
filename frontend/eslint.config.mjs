// ESLint 9 flat config for the frontend (React + TS)
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import refresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // replaces .eslintignore
  { ignores: ['dist/**', 'build/**', 'node_modules/**'] },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser }, // window, document, fetch, localStorage, etc.
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': hooks,
      '@typescript-eslint': ts,
      'react-refresh': refresh,
    },
    rules: {
      // base
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // project preferences
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'react-refresh/only-export-components': 'warn',
      'no-control-regex': 'off',
    },
  },

  // Node-only files (so `process` etc. are defined)
  {
    files: [
      'vite.config.*',
      '*.config.*',
      '.*rc.*',
      'eslint.config.*',
      'commitlint.config.*',
      'prettier.*',
    ],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
