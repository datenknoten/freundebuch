import { NotFoundError } from '@datenknoten/kit';

export class EncounterNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Encounter', id);
  }
}
