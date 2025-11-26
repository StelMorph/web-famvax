import { defineConfig } from 'vitest/config';

export default defineConfig({

  test: {

    include: ['integration-tests/**/*.test.ts'],

    // You might want to set a longer timeout for integration tests

    testTimeout: 30000, // 30 seconds

    hookTimeout: 30000,

    threads: false, // Run in a single thread to avoid DataCloneError with axios

    // Disable coverage for integration tests by default, or configure as needed

    coverage: {

      enabled: false,

    },

  },

});


