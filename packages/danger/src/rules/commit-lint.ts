import lint from '@commitlint/lint';
import load from '@commitlint/load';
import type { DangerRule } from '../types';

const commitLint: DangerRule = async () => {
  const config = await load({}, { file: 'commitlint.config.mjs' });
  const opts = {
    parserOpts: config.parserPreset?.parserOpts ?? {},
    plugins: config.plugins ?? {},
  };

  for (const commit of danger.git.commits) {
    const { message } = commit;

    // Skip merge commits
    if (message.startsWith('Merge ')) continue;

    // Skip semantic-release auto-commits
    if (message.startsWith('chore(release):')) continue;

    const result = await lint(message, config.rules, opts);

    if (result.valid) continue;

    for (const error of result.errors) {
      fail(`Commit "${message.split('\n')[0]}": ${error.message} [${error.name}]`);
    }

    for (const warning of result.warnings) {
      warn(`Commit "${message.split('\n')[0]}": ${warning.message} [${warning.name}]`);
    }
  }
};

export default commitLint;
