import { defineConfig } from 'vitest/config';
export default defineConfig({
  define: { __NBG_FIXTURES__: 'false' },
  test: { include: ['tests/unit/**/*.test.ts', 'tests/demo/**/*.test.ts'] },
});
