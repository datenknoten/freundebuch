import reportCoverage from 'danger-plugin-coverage';

/**
 * Danger runs from the repo root and clover stores absolute file paths, so the plugin's
 * `path.relative(cwd, ...)` matching lines up with Danger's repo-relative changed-file list.
 * The `checks` job hands both reports to `danger` as artifacts, so a missing report means that
 * job failed or was skipped — worth a warning rather than silence.
 */
const CLOVER_REPORTS = [
  'apps/frontend/coverage/clover.xml',
  'apps/backend/coverage/clover.xml',
] as const;

const THRESHOLD = { statements: 80, branches: 80, functions: 80, lines: 80 } as const;

/** Reports coverage of the changed files per workspace; files below the threshold do not fail the MR. */
export async function coverage() {
  for (const cloverReportPath of CLOVER_REPORTS) {
    await reportCoverage({ cloverReportPath, warnOnNoReport: true, threshold: THRESHOLD });
  }
}
