import { type Traversal, type } from 'arktype';

function checkName(name: string, ctx: Traversal) {
  if (name.trim().length === 0) {
    return ctx.mustBe('a non-empty name');
  }
  if (name.length > 200) {
    return ctx.mustBe('a name of 200 characters or less');
  }
  return true;
}

export const CollectiveNameSchema = type('string > 0').narrow(checkName);
