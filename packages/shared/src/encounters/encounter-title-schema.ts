import { type Traversal, type } from 'arktype';
import { isValidTitle } from './is-valid-title.js';

function checkTitle(title: string, ctx: Traversal): boolean {
  if (isValidTitle(title) === true) {
    return true;
  }
  return ctx.mustBe('a non-blank title of at most 200 characters');
}

export const EncounterTitleSchema = type('string > 0').narrow(checkTitle);
