import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';

export function registerFriendsTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.registerTool(
    'list_friends',
    {
      description:
        'List friends with pagination, sorting, and filtering. Returns a paginated list of friend summaries with basic info like name, primary email/phone, city, and circle memberships.',
      inputSchema: type({
        page: type('number.integer >= 1').describe('Page number (1-based)', 'self').default(1),
        pageSize: type('1 <= number.integer <= 100')
          .describe('Number of friends per page', 'self')
          .default(25),
        sortBy: type
          .enumerated('display_name', 'created_at', 'updated_at')
          .describe('Field to sort by', 'self')
          .default('display_name'),
        sortOrder: type.enumerated('asc', 'desc').describe('Sort direction', 'self').default('asc'),
        'favorites?': type('boolean').describe('Filter to only favorites', 'self'),
        'archived?': type('boolean | "only"').describe(
          'true = include archived, "only" = only archived, omit = exclude archived',
          'self',
        ),
      }),
    },
    async ({ page, pageSize, sortBy, sortOrder, favorites, archived }) => {
      const result = await services.friends.listFriends(getUserId(), {
        page,
        pageSize,
        sortBy,
        sortOrder,
        favorites,
        archived,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'get_friend',
    {
      description:
        'Get complete details for a single friend including all sub-resources: phones, emails, addresses, URLs, dates, relationships, professional history, social profiles, met info, and circle memberships.',
      inputSchema: type({
        friendId: type('string.uuid').describe('The friend ID (UUID)', 'self'),
      }),
    },
    async ({ friendId }) => {
      const friend = await services.friends.getFriendById(getUserId(), friendId);
      if (!friend) {
        return { content: [{ type: 'text' as const, text: 'Friend not found.' }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(friend, null, 2) }] };
    },
  );

  server.registerTool(
    'search_friends',
    {
      description:
        'Full-text search across all friend data. Searches names, nicknames, organization, job title, emails, phones, notes, addresses, and met context. Returns results ranked by relevance with highlighted matches.',
      inputSchema: type({
        query: type('string > 0').describe('Search query text', 'self'),
        limit: type('1 <= number.integer <= 50')
          .describe('Maximum number of results', 'self')
          .default(10),
      }),
    },
    async ({ query, limit }) => {
      const results = await services.friends.fullTextSearch(getUserId(), query, limit);
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.registerTool(
    'faceted_search',
    {
      description:
        'Advanced search with filtering by location, profession, relationship category, and circles. Optionally includes facet counts for understanding data distribution.',
      inputSchema: type({
        'query?': type('string').describe('Optional search query text', 'self'),
        page: type('number.integer >= 1').describe('Page number', 'self').default(1),
        pageSize: type('1 <= number.integer <= 100')
          .describe('Number of results per page', 'self')
          .default(25),
        sortBy: type
          .enumerated('relevance', 'display_name', 'created_at', 'updated_at')
          .describe('Sort field (relevance only works with a query)', 'self')
          .default('display_name'),
        sortOrder: type.enumerated('asc', 'desc').describe('Sort direction', 'self').default('asc'),
        filters: type({
          'country?': type('string[]').describe(
            'Filter by ISO 3166-1 alpha-2 country codes, e.g. "DE"',
            'self',
          ),
          'city?': type('string[]').describe('Filter by city names', 'self'),
          'organization?': type('string[]').describe('Filter by organization names', 'self'),
          'job_title?': type('string[]').describe('Filter by job titles', 'self'),
          'department?': type('string[]').describe('Filter by departments', 'self'),
          'relationship_category?': type('("family" | "professional" | "social")[]').describe(
            'Filter by relationship categories: family, professional, or social',
            'self',
          ),
          'circles?': type('string.uuid[]').describe('Filter by circle IDs', 'self'),
          'favorites?': type('boolean').describe('Filter to favorites only', 'self'),
          'archived?': type
            .enumerated('include', 'exclude', 'only')
            .describe('Archived filter', 'self'),
        })
          .describe('Filter criteria', 'self')
          .default(() => ({})),
        includeFacets: type('boolean')
          .describe('Include facet counts in response for understanding data distribution', 'self')
          .default(false),
      }),
    },
    async ({ query, page, pageSize, sortBy, sortOrder, filters, includeFacets }) => {
      const options = {
        query,
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters,
        includeFacets,
      };

      const results = query
        ? await services.friends.facetedSearch(getUserId(), options)
        : await services.friends.filterOnlyList(getUserId(), options);
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.registerTool(
    'get_upcoming_dates',
    {
      description:
        'Get upcoming birthdays, anniversaries, and other important dates across all friends. Useful for reminders and planning.',
      inputSchema: type({
        days: type('1 <= number.integer <= 365')
          .describe('Number of days ahead to look', 'self')
          .default(30),
        limit: type('1 <= number.integer <= 100')
          .describe('Maximum number of dates', 'self')
          .default(20),
      }),
    },
    async ({ days, limit }) => {
      const dates = await services.friends.getUpcomingDates(getUserId(), { days, limit });
      return { content: [{ type: 'text' as const, text: JSON.stringify(dates, null, 2) }] };
    },
  );

  server.registerTool(
    'get_network_graph',
    {
      description:
        'Get the relationship network graph showing how friends are connected to each other. Returns nodes (friends) and links (relationships between them). Useful for understanding social connections.',
    },
    async () => {
      const data = await services.friends.getNetworkGraphData(getUserId());
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
