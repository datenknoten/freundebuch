import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

export function registerFriendsTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_friends',
    'List friends with pagination, sorting, and filtering. Returns a paginated list of friend summaries with basic info like name, primary email/phone, city, and circle memberships.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      pageSize: z.number().int().min(1).max(100).default(25).describe('Number of friends per page'),
      sortBy: z
        .enum(['display_name', 'created_at', 'updated_at'])
        .default('display_name')
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('asc').describe('Sort direction'),
      favorites: z.boolean().optional().describe('Filter to only favorites'),
      archived: z
        .union([z.boolean(), z.literal('only')])
        .optional()
        .describe('true = include archived, "only" = only archived, omit = exclude archived'),
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

  server.tool(
    'get_friend',
    'Get complete details for a single friend including all sub-resources: phones, emails, addresses, URLs, dates, relationships, professional history, social profiles, met info, and circle memberships.',
    {
      friendId: z.string().uuid().describe('The friend ID (UUID)'),
    },
    async ({ friendId }) => {
      const friend = await services.friends.getFriendById(getUserId(), friendId);
      if (!friend) {
        return { content: [{ type: 'text' as const, text: 'Friend not found.' }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(friend, null, 2) }] };
    },
  );

  server.tool(
    'search_friends',
    'Full-text search across all friend data. Searches names, nicknames, organization, job title, emails, phones, notes, addresses, and met context. Returns results ranked by relevance with highlighted matches.',
    {
      query: z.string().min(1).describe('Search query text'),
      limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of results'),
    },
    async ({ query, limit }) => {
      const results = await services.friends.fullTextSearch(getUserId(), query, limit);
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.tool(
    'faceted_search',
    'Advanced search with filtering by location, profession, relationship category, and circles. Optionally includes facet counts for understanding data distribution.',
    {
      query: z.string().optional().describe('Optional search query text'),
      page: z.number().int().min(1).default(1).describe('Page number'),
      pageSize: z.number().int().min(1).max(100).default(25).describe('Number of results per page'),
      sortBy: z
        .enum(['relevance', 'display_name', 'created_at', 'updated_at'])
        .default('display_name')
        .describe('Sort field (relevance only works with a query)'),
      sortOrder: z.enum(['asc', 'desc']).default('asc').describe('Sort direction'),
      filters: z
        .object({
          country: z.array(z.string()).optional().describe('Filter by country names'),
          city: z.array(z.string()).optional().describe('Filter by city names'),
          organization: z.array(z.string()).optional().describe('Filter by organization names'),
          job_title: z.array(z.string()).optional().describe('Filter by job titles'),
          department: z.array(z.string()).optional().describe('Filter by departments'),
          relationship_category: z
            .array(z.enum(['family', 'professional', 'social']))
            .optional()
            .describe('Filter by relationship categories: family, professional, or social'),
          circles: z.array(z.string().uuid()).optional().describe('Filter by circle IDs'),
          favorites: z.boolean().optional().describe('Filter to favorites only'),
          archived: z.enum(['include', 'exclude', 'only']).optional().describe('Archived filter'),
        })
        .default({})
        .describe('Filter criteria'),
      includeFacets: z
        .boolean()
        .default(false)
        .describe('Include facet counts in response for understanding data distribution'),
    },
    async ({ query, page, pageSize, sortBy, sortOrder, filters, includeFacets }) => {
      const options = {
        query,
        page,
        pageSize,
        sortBy: sortBy as 'relevance' | 'display_name' | 'created_at' | 'updated_at',
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

  server.tool(
    'get_upcoming_dates',
    'Get upcoming birthdays, anniversaries, and other important dates across all friends. Useful for reminders and planning.',
    {
      days: z.number().int().min(1).max(365).default(30).describe('Number of days ahead to look'),
      limit: z.number().int().min(1).max(100).default(20).describe('Maximum number of dates'),
    },
    async ({ days, limit }) => {
      const dates = await services.friends.getUpcomingDates(getUserId(), { days, limit });
      return { content: [{ type: 'text' as const, text: JSON.stringify(dates, null, 2) }] };
    },
  );

  server.tool(
    'get_network_graph',
    'Get the relationship network graph showing how friends are connected to each other. Returns nodes (friends) and links (relationships between them). Useful for understanding social connections.',
    {},
    async () => {
      const data = await services.friends.getNetworkGraphData(getUserId());
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
