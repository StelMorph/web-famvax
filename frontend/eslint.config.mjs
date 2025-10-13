// frontend/eslint.config.mjs
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // 1) ignores must be its own object and must be an ARRAY
  { ignores: ['dist/**', 'build/**', 'node_modules/**'] },

  // 2) main ruleset
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser, // window, document, fetch, URL, etc.
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': hooks,
      '@typescript-eslint': ts,
      'react-refresh': refresh,
    },
    rules: {
      // base recs
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // project choices
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
];
