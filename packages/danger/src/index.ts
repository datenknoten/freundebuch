import { commitLint } from './rules/commit-lint';
import { coverage } from './rules/coverage';
import { kebabCaseFiles } from './rules/kebab-case-files';
import { pinnedPackages } from './rules/pinned-packages';

type DangerRule = () => Promise<void> | void;

export const DANGER_RULES = [
  commitLint,
  kebabCaseFiles,
  pinnedPackages,
  coverage,
] as const satisfies readonly DangerRule[];
