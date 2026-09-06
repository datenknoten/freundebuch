import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    // One shared PostGIS server for the whole run; each suite clones a fresh
    // database from the migrated template (see tests/global-setup.ts).
    globalSetup: ['./tests/global-setup.ts'],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
  },
});
