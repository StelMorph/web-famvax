import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import refresh from 'eslint-plugin-react-refresh';

export default [
  // ⬇️ this replaces .eslintignore
  { ignores: ['dist/**', 'build/**', 'node_modules/**', 'prettier.js', 'commitlint.config.cjs', 'vite.config.js', '*.config.js'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly' }
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': hooks, '@typescript-eslint': ts, 'react-refresh': refresh },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // your project choices
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
      ],
      'react-refresh/only-export-components': 'warn',
      'no-control-regex': 'off'
    }
  }
];
