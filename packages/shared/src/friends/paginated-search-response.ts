import type { Paginated } from '../pagination/paginated.js';
import type { GlobalSearchResult } from './global-search-result.js';

/** Paginated search response */
export type PaginatedSearchResponse = Paginated<GlobalSearchResult>;
