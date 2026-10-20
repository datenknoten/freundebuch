import { DataIntegrityError } from '../errors/data-integrity.error.js';

export function makeEnumParser<T>(schema: { assert: (data: unknown) => T }, label: string) {
  function parseEnum(value: string) {
    try {
      return schema.assert(value);
    } catch {
      // A stored value outside the union means the schema and the code
      // disagree, which is a 500, not a client error. The raw value stays out
      // of the message because that message is returned to the client.
      throw new DataIntegrityError(label);
    }
  }
  return parseEnum;
}
