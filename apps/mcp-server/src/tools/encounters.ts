import {
  ENCOUNTER_TITLE_MAX_LENGTH,
  ENCOUNTER_TYPES,
  type EncounterUpdate,
} from '@freundebuch/shared/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

export function registerEncountersTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_encounters',
    'List encounters (meetings, events, interactions) with pagination and filtering. Can filter by friend, date range, or search text. Each encounter shows the title, date, location, and a preview of associated friends.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Number of encounters per page'),
      friendId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter to encounters with a specific friend'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter encounters from this date (ISO 8601 format, e.g. "2024-01-01")'),
      toDate: z
        .string()
        .optional()
        .describe('Filter encounters up to this date (ISO 8601 format, e.g. "2024-12-31")'),
      search: z.string().optional().describe('Search by encounter title, description, or location'),
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

  server.tool(
    'get_encounter',
    'Get complete details for a single encounter including its title, date, location, description, and all associated friends.',
    {
      encounterId: z.string().uuid().describe('The encounter ID (UUID)'),
    },
    async ({ encounterId }) => {
      const encounter = await services.encounters.getEncounterById(getUserId(), encounterId);
      if (!encounter) {
        return { content: [{ type: 'text' as const, text: 'Encounter not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );

  server.tool(
    'create_encounter',
    'Create a new encounter (meeting, event, or interaction) and associate it with one or more friends. Requires a date and at least one friend. Returns the created encounter with its ID and associated friends.',
    {
      encounterDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .describe('Date the encounter took place (ISO 8601 date, e.g. "2024-06-15")'),
      friendIds: z
        .array(z.string().uuid())
        .min(1)
        .describe('IDs (UUIDs) of the friends involved in the encounter; at least one is required'),
      encounterType: z
        .enum(ENCOUNTER_TYPES)
        .default('in_person')
        .describe('Kind of contact: in_person, phone_call, video_call, or message'),
      title: z
        .string()
        .trim()
        .min(1)
        .max(ENCOUNTER_TITLE_MAX_LENGTH)
        .nullish()
        .describe('Optional title; if omitted the UI derives a label for calls/messages'),
      locationText: z
        .string()
        .nullish()
        .describe('Optional free-text location where the encounter took place'),
      description: z.string().nullish().describe('Optional notes or description of what happened'),
    },
    async ({ encounterDate, friendIds, encounterType, title, locationText, description }) => {
      const encounter = await services.encounters.createEncounter(getUserId(), {
        encounter_date: encounterDate,
        friend_ids: friendIds,
        encounter_type: encounterType,
        // `title` has no null variant in EncounterInput; treat an explicit null as unset.
        title: title ?? undefined,
        location_text: locationText,
        description,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );

  server.tool(
    'edit_encounter',
    'Update an existing encounter. Only the fields you pass are changed; omitted fields keep their current value. Pass null for title, locationText, or description to clear them. Passing friendIds replaces the full list of associated friends. Returns the updated encounter.',
    {
      encounterId: z.string().uuid().describe('The encounter ID (UUID) to update'),
      encounterDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .optional()
        .describe('New date the encounter took place (ISO 8601 date, e.g. "2024-06-15")'),
      friendIds: z
        .array(z.string().uuid())
        .min(1)
        .optional()
        .describe(
          'Replacement list of friend IDs (UUIDs); replaces all current friends, so include everyone who was involved',
        ),
      encounterType: z
        .enum(ENCOUNTER_TYPES)
        .optional()
        .describe('New kind of contact: in_person, phone_call, video_call, or message'),
      title: z
        .string()
        .trim()
        .min(1)
        .max(ENCOUNTER_TITLE_MAX_LENGTH)
        .nullish()
        .describe('New title; pass null to clear it'),
      locationText: z.string().nullish().describe('New free-text location; pass null to clear it'),
      description: z.string().nullish().describe('New notes or description; pass null to clear it'),
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
      // Only forward the fields that were actually supplied: the service uses
      // `'field' in input` to tell "leave untouched" apart from "clear to null".
      const update: EncounterUpdate = {};
      if (encounterDate !== undefined) {
        update.encounter_date = encounterDate;
      }
      if (friendIds !== undefined) {
        update.friend_ids = friendIds;
      }
      if (encounterType !== undefined) {
        update.encounter_type = encounterType;
      }
      if (title !== undefined) {
        update.title = title;
      }
      if (locationText !== undefined) {
        update.location_text = locationText;
      }
      if (description !== undefined) {
        update.description = description;
      }

      const encounter = await services.encounters.updateEncounter(getUserId(), encounterId, update);
      if (encounter === null) {
        return { content: [{ type: 'text' as const, text: 'Encounter not found.' }] };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(encounter, null, 2) }],
      };
    },
  );
}
