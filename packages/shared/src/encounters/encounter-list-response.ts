import type { Paginated } from '../pagination/paginated.js';
import type { EncounterListItem } from './encounter-list-item.js';

/** Paginated encounter list response */
export type EncounterListResponse = Paginated<EncounterListItem>;
