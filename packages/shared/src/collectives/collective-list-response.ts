import type { Paginated } from '../pagination/paginated.js';
import type { CollectiveListItem } from './collective-list-item.js';

/** Paginated collective list response */
export type CollectiveListResponse = Paginated<CollectiveListItem>;
