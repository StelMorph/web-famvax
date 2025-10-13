// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This adds a polyfill for the 'global' object that the AWS SDK
    // and other libraries expect to exist. We are aliasing it to
    // 'globalThis', which is the modern standard and works in browsers.
    global: 'globalThis',
  },
});
