import {
  ARCHIVED_FILTERS,
  FRIEND_SORT_BY_FIELDS,
  RELATIONSHIP_CATEGORIES,
  SEARCH_SORT_BY_FIELDS,
  SORT_ORDERS,
} from '@freundebuch/shared/index.js';
import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';
import { jsonResult, textResult } from './tool-result.js';

const ListFriendsInputSchema = type({
  page: type('number.integer >= 1').describe('Page number (1-based)', 'self').default(1),
  pageSize: type('1 <= number.integer <= 100')
    .describe('Number of friends per page', 'self')
    .default(25),
  sortBy: type
    .enumerated(...FRIEND_SORT_BY_FIELDS)
    .describe('Field to sort by', 'self')
    .default('display_name'),
  sortOrder: type
    .enumerated(...SORT_ORDERS)
    .describe('Sort direction', 'self')
    .default('asc'),
  'favorites?': type('boolean').describe('Filter to only favorites', 'self'),
  'archived?': type('boolean | "only"').describe(
    'true = include archived, "only" = only archived, omit = exclude archived',
    'self',
  ),
});

const GetFriendInputSchema = type({
  friendId: type('string.uuid').describe('The friend ID (UUID)', 'self'),
});

const SearchFriendsInputSchema = type({
  query: type('string > 0').describe('Search query text', 'self'),
  limit: type('1 <= number.integer <= 50')
    .describe('Maximum number of results', 'self')
    .default(10),
});

const FacetedSearchInputSchema = type({
  'query?': type('string').describe('Optional search query text', 'self'),
  page: type('number.integer >= 1').describe('Page number', 'self').default(1),
  pageSize: type('1 <= number.integer <= 100')
    .describe('Number of results per page', 'self')
    .default(25),
  sortBy: type
    .enumerated(...SEARCH_SORT_BY_FIELDS)
    .describe('Sort field (relevance only works with a query)', 'self')
    .default('display_name'),
  sortOrder: type
    .enumerated(...SORT_ORDERS)
    .describe('Sort direction', 'self')
    .default('asc'),
  filters: type({
    'country?': type('string[]').describe(
      'Filter by ISO 3166-1 alpha-2 country codes, e.g. "DE"',
      'self',
    ),
    'city?': type('string[]').describe('Filter by city names', 'self'),
    'organization?': type('string[]').describe('Filter by organization names', 'self'),
    'job_title?': type('string[]').describe('Filter by job titles', 'self'),
    'department?': type('string[]').describe('Filter by departments', 'self'),
    'relationship_category?': type
      .enumerated(...RELATIONSHIP_CATEGORIES)
      .array()
      .describe('Filter by relationship categories: family, professional, or social', 'self'),
    'circles?': type('string.uuid[]').describe('Filter by circle IDs', 'self'),
    'favorites?': type('boolean').describe('Filter to favorites only', 'self'),
    'archived?': type.enumerated(...ARCHIVED_FILTERS).describe('Archived filter', 'self'),
  })
    .describe('Filter criteria', 'self')
    .default(() => ({})),
  includeFacets: type('boolean')
    .describe('Include facet counts in response for understanding data distribution', 'self')
    .default(false),
});

const GetUpcomingDatesInputSchema = type({
  days: type('1 <= number.integer <= 365')
    .describe('Number of days ahead to look', 'self')
    .default(30),
  limit: type('1 <= number.integer <= 100').describe('Maximum number of dates', 'self').default(20),
});

export function registerFriendsTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  async function listFriends(input: typeof ListFriendsInputSchema.infer) {
    const result = await services.friends.listFriends(getUserId(), {
      page: input.page,
      pageSize: input.pageSize,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      isFavoritesOnly: input.favorites,
      archived: input.archived,
    });
    return jsonResult(result);
  }

  async function getFriend({ friendId }: typeof GetFriendInputSchema.infer) {
    const friend = await services.friends.findFriend(getUserId(), friendId);
    if (friend === undefined) {
      return textResult('Friend not found.');
    }
    return jsonResult(friend);
  }

  async function searchFriends({ query, limit }: typeof SearchFriendsInputSchema.infer) {
    return jsonResult(await services.friends.fullTextSearch(getUserId(), query, limit));
  }

  async function facetedSearch(input: typeof FacetedSearchInputSchema.infer) {
    const options = {
      query: input.query,
      page: input.page,
      pageSize: input.pageSize,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      filters: input.filters,
      shouldIncludeFacets: input.includeFacets,
    };
    if (input.query === undefined || input.query === '') {
      return jsonResult(await services.friends.filterOnlyList(getUserId(), options));
    }
    return jsonResult(await services.friends.facetedSearch(getUserId(), options));
  }

  async function getUpcomingDates(input: typeof GetUpcomingDatesInputSchema.infer) {
    return jsonResult(await services.friends.getUpcomingDates(getUserId(), input));
  }

  async function getNetworkGraph() {
    return jsonResult(await services.friends.getNetworkGraphData(getUserId()));
  }

  server.registerTool(
    'list_friends',
    {
      description:
        'List friends with pagination, sorting, and filtering. Returns a paginated list of friend summaries with basic info like name, primary email/phone, city, and circle memberships.',
      inputSchema: ListFriendsInputSchema,
    },
    listFriends,
  );

  server.registerTool(
    'get_friend',
    {
      description:
        'Get complete details for a single friend including all sub-resources: phones, emails, addresses, URLs, dates, relationships, professional history, social profiles, met info, and circle memberships.',
      inputSchema: GetFriendInputSchema,
    },
    getFriend,
  );

  server.registerTool(
    'search_friends',
    {
      description:
        'Full-text search across all friend data. Searches names, nicknames, organization, job title, emails, phones, notes, addresses, and met context. Returns results ranked by relevance with highlighted matches.',
      inputSchema: SearchFriendsInputSchema,
    },
    searchFriends,
  );

  server.registerTool(
    'faceted_search',
    {
      description:
        'Advanced search with filtering by location, profession, relationship category, and circles. Optionally includes facet counts for understanding data distribution.',
      inputSchema: FacetedSearchInputSchema,
    },
    facetedSearch,
  );

  server.registerTool(
    'get_upcoming_dates',
    {
      description:
        'Get upcoming birthdays, anniversaries, and other important dates across all friends. Useful for reminders and planning.',
      inputSchema: GetUpcomingDatesInputSchema,
    },
    getUpcomingDates,
  );

  server.registerTool(
    'get_network_graph',
    {
      description:
        'Get the relationship network graph showing how friends are connected to each other. Returns nodes (friends) and links (relationships between them). Useful for understanding social connections.',
    },
    getNetworkGraph,
  );
}
