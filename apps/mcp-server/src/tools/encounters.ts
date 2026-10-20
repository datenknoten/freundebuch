import type { EncounterUpdateData } from '@freundebuch/backend/services/encounters.service.js';
import {
  ENCOUNTER_TITLE_MAX_LENGTH,
  ENCOUNTER_TYPES,
  IsoDateStringSchema,
} from '@freundebuch/shared/index.js';
import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
import type { Services } from '../utils/service-factory.js';

export function registerEncountersTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.registerTool(
    'list_encounters',
    {
      description:
        'List encounters (meetings, events, interactions) with pagination and filtering. Can filter by friend, date range, or search text. Each encounter shows the title, date, location, and a preview of associated friends.',
      inputSchema: type({
        page: type('number.integer >= 1').describe('Page number (1-based)', 'self').default(1),
        pageSize: type('1 <= number.integer <= 100')
          .describe('Number of encounters per page', 'self')
          .default(20),
        'friendId?': type('string.uuid').describe(
          'Filter to encounters with a specific friend',
          'self',
        ),
        'fromDate?': type('string').describe(
          'Filter encounters from this date (ISO 8601 format, e.g. "2024-01-01")',
          'self',
        ),
        'toDate?': type('string').describe(
          'Filter encounters up to this date (ISO 8601 format, e.g. "2024-12-31")',
          'self',
        ),
        'search?': type('string').describe(
          'Search by encounter title, description, or location',
          'self',
        ),
      }),
    },
    async ({ page, pageSize, friendId, fromDate, toDate, search }) => {
      const result = await services.encounters.listEncounters(getUserId(), {
        page,
        pageSize,
        friendId,
        fromDate,
        toDate,
        search,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'get_encounter',
    {
      description:
        'Get complete details for a single encounter including its title, date, location, description, and all associated friends.',
      inputSchema: type({
        encounterId: type('string.uuid').describe('The encounter ID (UUID)', 'self'),
      }),
    },
    async ({ encounterId }) => {
      const encounter = await services.encounters.findEncounter(getUserId(), encounterId);
      if (encounter === undefined) {
        return { content: [{ type: 'text' as const, text: 'Encounter not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );

  server.registerTool(
    'create_encounter',
    {
      description:
        'Create a new encounter (meeting, event, or interaction) and associate it with one or more friends. Requires a date and at least one friend. Returns the created encounter with its ID and associated friends.',
      inputSchema: type({
        encounterDate: IsoDateStringSchema.describe(
          'Date the encounter took place (ISO 8601 date, e.g. "2024-06-15")',
          'self',
        ),
        friendIds: type('string.uuid[] > 0').describe(
          'IDs (UUIDs) of the friends involved in the encounter; at least one is required',
          'self',
        ),
        encounterType: type
          .enumerated(...ENCOUNTER_TYPES)
          .describe('Kind of contact: in_person, phone_call, video_call, or message', 'self')
          .default('in_person'),
        // Plain describe() on the trimmed fields: a 'self' description does not
        // survive into the JSON Schema of a morph's input side.
        'title?': type('string.trim')
          .to(`0 < string <= ${ENCOUNTER_TITLE_MAX_LENGTH}`)
          .or('null')
          .describe('Optional title; if omitted the UI derives a label for calls/messages'),
        'locationText?': type('string | null').describe(
          'Optional free-text location where the encounter took place',
          'self',
        ),
        'description?': type('string | null').describe(
          'Optional notes or description of what happened',
          'self',
        ),
      }),
    },
    async ({ encounterDate, friendIds, encounterType, title, locationText, description }) => {
      const encounter = await services.encounters.createEncounter(getUserId(), {
        encounterDate,
        friendIds,
        encounterType,
        // `title` has no null variant on create; treat an explicit null as unset.
        title: title ?? undefined,
        locationText,
        description,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );

  server.registerTool(
    'edit_encounter',
    {
      description:
        'Update an existing encounter. Only the fields you pass are changed; omitted fields keep their current value. Pass null for title, locationText, or description to clear them. Passing friendIds replaces the full list of associated friends. Returns the updated encounter.',
      inputSchema: type({
        encounterId: type('string.uuid').describe('The encounter ID (UUID) to update', 'self'),
        'encounterDate?': IsoDateStringSchema.describe(
          'New date the encounter took place (ISO 8601 date, e.g. "2024-06-15")',
          'self',
        ),
        'friendIds?': type('string.uuid[] > 0').describe(
          'Replacement list of friend IDs (UUIDs); replaces all current friends, so include everyone who was involved',
          'self',
        ),
        'encounterType?': type
          .enumerated(...ENCOUNTER_TYPES)
          .describe('New kind of contact: in_person, phone_call, video_call, or message', 'self'),
        'title?': type('string.trim')
          .to(`0 < string <= ${ENCOUNTER_TITLE_MAX_LENGTH}`)
          .or('null')
          .describe('New title; pass null to clear it'),
        'locationText?': type('string | null').describe(
          'New free-text location; pass null to clear it',
          'self',
        ),
        'description?': type('string | null').describe(
          'New notes or description; pass null to clear it',
          'self',
        ),
      }),
    },
    async ({
      encounterId,
      encounterDate,
      friendIds,
      encounterType,
      title,
      locationText,
      description,
    }) => {
      const userId = getUserId();
      const existing = await services.encounters.findEncounter(userId, encounterId);
      if (existing === undefined) {
        return { content: [{ type: 'text' as const, text: 'Encounter not found.' }] };
      }

      // Only forward supplied fields: an absent key leaves the field untouched,
      // `null` clears it.
      const update: EncounterUpdateData = {};
      if (encounterDate !== undefined) {
        update.encounterDate = encounterDate;
      }
      if (friendIds !== undefined) {
        update.friendIds = friendIds;
      }
      if (encounterType !== undefined) {
        update.encounterType = encounterType;
      }
      if (title !== undefined) {
        update.title = title;
      }
      if (locationText !== undefined) {
        update.locationText = locationText;
      }
      if (description !== undefined) {
        update.description = description;
      }

      const encounter = await services.encounters.updateEncounter(userId, encounterId, update);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );
}
