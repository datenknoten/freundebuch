import type { DangerRule } from '../types';
import commitLint from './commit-lint';
import kebabCaseFiles from './kebab-case-files';
import pinnedPackages from './pinned-packages';

export const allRules: DangerRule[] = [commitLint, kebabCaseFiles, pinnedPackages];
