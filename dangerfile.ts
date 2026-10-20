import { exitWith } from '@datenknoten/kit/cli';
import { DANGER_RULES } from './packages/danger/src/index';

async function main() {
  for (const rule of DANGER_RULES) {
    await rule();
  }
}

void main().catch(exitWith);
