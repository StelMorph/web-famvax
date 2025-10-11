// eslint.config.js (root, ESLint 9 flat)
import frontend from './frontend/eslint.config.mjs';
import backend from './backend/eslint.config.mjs';

const withPrefix = (configs, prefix) =>
  configs.map((c) => ({
    ...c,
    // scope each config to its folder
    files: c.files ? c.files.map((f) => `${prefix}/${f}`) : [`${prefix}/**/*`],
    // also prefix ignores if present
    ignores: c.ignores ? c.ignores.map((i) => `${prefix}/${i}`) : undefined,
  }));

export default [
  // global ignores (so running at root doesn't scan outputs)
  { ignores: ['**/node_modules', '**/dist', '**/build'] },

  // forward to package configs
  ...withPrefix(frontend, 'frontend'),
  ...withPrefix(backend, 'backend'),
];
