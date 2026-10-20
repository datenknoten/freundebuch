import { NotFoundError } from '@datenknoten/kit';

/** A sub-resource (address, note, relationship …) that has no class of its own. */
export class ResourceNotFoundError extends NotFoundError {
  constructor(resource: string, id: string) {
    super(resource, id);
  }
}
