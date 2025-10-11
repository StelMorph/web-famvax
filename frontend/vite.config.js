// frontend/vite.config.js

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// This function will now run when Vite starts, loading your .env file
export default defineConfig(({ mode }) => {
  // Load environment variables from the .env file in the root directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This line is a necessary polyfill from your original config, we keep it.
      global: '({})',

      // === THE FIX ===
      // Instead of using hardcoded constants, we now inject the values
      // that were loaded from your .env file.
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_COGNITO_USER_POOL_ID': JSON.stringify(env.VITE_COGNITO_USER_POOL_ID),
      'import.meta.env.VITE_COGNITO_CLIENT_ID': JSON.stringify(env.VITE_COGNITO_CLIENT_ID),
      'import.meta.env.VITE_AWS_REGION': JSON.stringify(env.VITE_AWS_REGION),
      // ===============
    },
    resolve: {
      alias: {
        // ... any aliases you had before will be preserved
      },
    },
  };
});
