import lint from '@commitlint/lint';
import load from '@commitlint/load';

/** Merge commits and the semantic-release commits are not authored by hand. */
const SKIPPED_PREFIXES = ['Merge ', 'chore(release):'] as const;

/** Fails the MR for every commitlint error; a commit without errors also keeps its warnings quiet. */
export async function commitLint() {
  const config = await load({}, { file: 'commitlint.config.mjs' });
  const options = {
    parserOpts: config.parserPreset?.parserOpts ?? {},
    plugins: config.plugins ?? {},
  };

  for (const { message } of danger.git.commits) {
    if (SKIPPED_PREFIXES.some((prefix) => message.startsWith(prefix)) === true) {
      continue;
    }

    const result = await lint(message, config.rules, options);
    if (result.valid === true) {
      continue;
    }

    const header = message.split('\n')[0];
    for (const error of result.errors) {
      fail(`Commit "${header}": ${error.message} [${error.name}]`);
    }
    for (const warning of result.warnings) {
      warn(`Commit "${header}": ${warning.message} [${warning.name}]`);
    }
  }
}
