import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so tests run in a plain Node environment
// without the React / Tailwind plugins.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
