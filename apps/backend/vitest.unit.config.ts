import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

/**
 * Unit-test config: everything from `vitest.config.ts` except the PostGIS
 * container.
 *
 * `globalSetup` runs for *any* invocation, so excluding the integration
 * suites on the command line is not enough — the container would still be
 * started, and would fail on a machine without Docker. The pre-push hook runs
 * this config, so a push never depends on Docker; CI runs the full one.
 *
 * The overrides are spliced in by hand rather than with `mergeConfig`, which
 * concatenates arrays: `globalSetup: []` would merge back to the base value.
 */
const base = baseConfig.test ?? {};

export default defineConfig({
  ...baseConfig,
  test: {
    ...base,
    globalSetup: [],
    exclude: [...(base.exclude ?? []), '**/tests/integration/**'],
  },
});
