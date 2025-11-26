// ESLint v9 flat config for the backend (Node + TS + Vitest/Jest tests)
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // Ignore build & generated output and JS bins we don't want to lint strictly
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'cdk.out/**',
      'bin/**',                    // compiled/entry JS
      'utils/loadSecrets.js'       // keep as-is, allow require()
    ],
  },

  // TypeScript source files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node, // __dirname, Buffer, process, console, setTimeout, etc.
        fetch: 'readonly' // if you polyfill/fetch in Lambda runtime
      },
    },
    plugins: { '@typescript-eslint': ts },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // project choices
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_|_err', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  // Plain JS files (keep permissive for legacy/entry JS)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': ts },
    rules: {
      '@typescript-eslint/no-require-imports': 'off', // allow require() in JS files
    },
  },

  // Test files: enable Jest/Vitest globals so "test" etc. are defined
  {
    files: ['test/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest, // provides test/expect/describe
      },
    },
    rules: {},
  },
];
