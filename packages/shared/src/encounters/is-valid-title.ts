import { ENCOUNTER_TITLE_MAX_LENGTH } from './encounter-title.js';

/** A title is valid when it's non-blank after trimming and within the DB length limit. */
export function isValidTitle(title: string): boolean {
  return title.trim().length > 0 && title.length <= ENCOUNTER_TITLE_MAX_LENGTH;
}
