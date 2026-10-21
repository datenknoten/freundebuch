import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';
import { jsonResult, textResult } from './tool-result.js';

const ListCollectivesInputSchema = type({
  page: type('number.integer >= 1').describe('Page number (1-based)', 'self').default(1),
  pageSize: type('1 <= number.integer <= 100')
    .describe('Number of collectives per page', 'self')
    .default(20),
  'typeId?': type('string.uuid').describe('Filter by collective type ID (UUID)', 'self'),
  'search?': type('string').describe('Search by collective name', 'self'),
});

const GetCollectiveInputSchema = type({
  collectiveId: type('string.uuid').describe('The collective ID (UUID)', 'self'),
});

export function registerCollectivesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  async function listCollectives(input: typeof ListCollectivesInputSchema.infer) {
    return jsonResult(await services.collectives.listCollectives(getUserId(), input));
  }

  async function getCollective({ collectiveId }: typeof GetCollectiveInputSchema.infer) {
    const collective = await services.collectives.findCollective(getUserId(), collectiveId);
    if (collective === undefined) {
      return textResult('Collective not found.');
    }
    return jsonResult(collective);
  }

  server.registerTool(
    'list_collectives',
    {
      description:
        'List all collectives (families, companies, clubs, friend groups) with pagination. Each collective includes a member preview showing the first few members.',
      inputSchema: ListCollectivesInputSchema,
    },
    listCollectives,
  );

  server.registerTool(
    'get_collective',
    {
      description:
        'Get complete details for a single collective including all members with their roles, addresses, phones, emails, URLs, and circle memberships.',
      inputSchema: GetCollectiveInputSchema,
    },
    getCollective,
  );
}
