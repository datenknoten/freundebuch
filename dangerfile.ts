import { allRules } from './packages/danger/src/rules/index';

async function main() {
  for (const rule of allRules) {
    await rule();
  }
}

main();
