// ESLint 9 flat config for the backend (Node + TS)
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // replaces .eslintignore
  { ignores: ['dist/**', 'build/**', 'node_modules/**', 'cdk.out/**', 'bin/**'] },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,                 // __dirname, Buffer, process, console, setTimeout...
        fetch: 'readonly',               // if you use undici/fetch in Node
      },
    },
    plugins: { '@typescript-eslint': ts },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // flip to "error" if you want to forbid require() in TS completely
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // tests (pick jest or vitest – adjust as needed)
  {
    files: ['**/*.test.{ts,js}', '**/__tests__/**/*.{ts,js}'],
    languageOptions: { globals: { ...globals.jest } }, // or ...globals.vitest
  },
];
