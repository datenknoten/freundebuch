// danger-plugin-coverage ships no type declarations; declare the slice we use.
declare module 'danger-plugin-coverage' {
  interface CoverageThreshold {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  }

  interface CoverageOptions {
    successMessage?: string;
    failureMessage?: string;
    /** Relative path to a clover.xml report (overrides auto-detection). */
    cloverReportPath?: string;
    maxRows?: number;
    maxChars?: number;
    maxUncovered?: number;
    wrapFilenames?: boolean;
    /** Emit a Danger warning when no report is found. */
    warnOnNoReport?: boolean;
    showAllFiles?: boolean;
    threshold?: Partial<CoverageThreshold>;
  }

  /** Posts a coverage table for files changed in the PR. */
  export function coverage(options?: CoverageOptions): Promise<void>;
  const _default: typeof coverage;
  export default _default;
}
