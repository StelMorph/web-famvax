import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // By removing the 'define' block, we fix the build error.
  // Vite automatically handles environment variables prefixed with "VITE_"
  // from your .env file and exposes them on `import.meta.env`.
  // No extra configuration is needed for them.
});
