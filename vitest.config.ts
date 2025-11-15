import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'frontend/vite.config.js', // Correct path to frontend config
      'backend/vitest.config.ts', // Path to your backend vitest config
    ],
  },
});
