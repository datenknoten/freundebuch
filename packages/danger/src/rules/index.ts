import type { DangerRule } from '../types';
import commitLint from './commit-lint';
import coverage from './coverage';
import kebabCaseFiles from './kebab-case-files';
import pinnedPackages from './pinned-packages';

export const allRules: DangerRule[] = [commitLint, kebabCaseFiles, pinnedPackages, coverage];
