import coverage from 'danger-plugin-coverage';
import type { DangerRule } from '../types';

/**
 * Per-workspace clover.xml reports. Danger runs from the repo root and clover
 * stores absolute file paths, so the plugin's `path.relative(cwd, ...)` matching
 * lines up with Danger's repo-relative changed-file list automatically. Each
 * report is reported on independently; a missing report is skipped silently
 * (warnOnNoReport: false).
 *
 * Only the frontend report is generated in CI today — backend coverage is
 * deferred because v8 instrumentation slows its better-auth integration tests
 * past their timeout. The backend path is kept here so it lights up
 * automatically once that report is produced.
 */
const CLOVER_REPORTS = ['apps/frontend/coverage/clover.xml', 'apps/backend/coverage/clover.xml'];

const THRESHOLD = { statements: 80, branches: 80, functions: 80, lines: 80 };

/**
 * Reports test coverage for the files changed in a PR, scoped per workspace.
 *
 * Report-only for now: danger-plugin-coverage marks files below the threshold
 * with an ✗ and a "threshold not met" note but does not itself fail the build.
 * Once the frontend test backfill brings the baseline above 80%, pair this with
 * an explicit `fail()` to make the gate blocking.
 */
const coverageRule: DangerRule = async () => {
  for (const cloverReportPath of CLOVER_REPORTS) {
    await coverage({
      cloverReportPath,
      // A PR usually touches a single workspace, so the other report won't be
      // present in that job — that's expected, not worth a warning.
      warnOnNoReport: false,
      threshold: THRESHOLD,
    });
  }
};

export default coverageRule;
