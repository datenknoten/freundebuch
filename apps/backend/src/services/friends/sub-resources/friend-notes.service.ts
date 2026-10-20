import { ConflictError, ValidationError } from '@datenknoten/kit';
import { EncounterTypeSchema, type FriendNoteResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { EncounterNotFoundError } from '../../../errors/encounter-not-found.error.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import { getEncounterInternalId } from '../../../models/queries/encounters.queries.js';
import {
  createFriendNote,
  deleteFriendNote,
  getFriendNoteInternalId,
  getFriendNotes,
  type IGetFriendNotesResult,
  updateFriendNote,
} from '../../../models/queries/friend-notes.queries.js';
import { getFriendInternalId } from '../../../models/queries/friends.queries.js';
import { formatDateOnly } from '../../../utils/date.js';
import { toUniqueViolationError } from '../../../utils/to-unique-violation-error.js';
import { withTransaction } from '../../../utils/with-transaction.js';

/** A note write. PUT replaces the whole note, so an omitted link means "no link". */
export interface FriendNoteData {
  content: string;
  encounterId?: string | null;
  sourceFriendId?: string | null;
  supersedesNoteId?: string | null;
}

/** Internal ids of the rows that a note links to; `null` means "no link". */
interface ResolvedNoteRefs {
  encounterId: number | null;
  sourceFriendId: number | null;
  supersedesNoteId: number | null;
}

/** The note that an update changes, so that it cannot supersede itself or a newer note. */
interface CurrentNote {
  externalId: string;
  id: number;
}

export interface FriendNotesServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

function supersedeConflict() {
  return new ConflictError('This note already has a newer version');
}

const SUPERSEDE_CONFLICTS = { idx_friend_notes_supersedes_note_id: supersedeConflict };

/**
 * FriendNotesService handles timestamped free-text notes about a friend.
 *
 * It does not extend SubResourceService: a note write must tell the client
 * which reference failed (unknown encounter, unknown source friend, unknown
 * superseded note), and its references resolve to internal ids first.
 */
export class FriendNotesService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: FriendNotesServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async list(userExternalId: string, friendExternalId: string) {
    this.logger.debug({ friendExternalId }, 'Listing notes');

    await this.resolveFriendId(this.db, userExternalId, friendExternalId);
    const rows = await getFriendNotes.run(
      { userExternalId, friendExternalId, noteExternalId: null },
      this.db,
    );
    return rows.map((row) => this.mapRow(row));
  }

  public async create(userExternalId: string, friendExternalId: string, data: FriendNoteData) {
    this.logger.debug({ friendExternalId }, 'Adding note');

    return withTransaction(this.db, (client) =>
      this.createWithin(client, userExternalId, friendExternalId, data),
    );
  }

  private async createWithin(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    data: FriendNoteData,
  ) {
    const friendId = await this.resolveFriendId(client, userExternalId, friendExternalId);
    const refs = await this.resolveRefs(client, userExternalId, friendExternalId, data, null);

    let created: { external_id: string }[];
    try {
      created = await createFriendNote.run(
        { userExternalId, friendId, content: data.content.trim(), ...refs },
        client,
      );
    } catch (error) {
      throw toUniqueViolationError(error, SUPERSEDE_CONFLICTS);
    }
    const [createdNote] = created;
    if (createdNote === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    return this.readNote(client, userExternalId, friendExternalId, createdNote.external_id);
  }

  /** An omitted link field clears the link. */
  public async update(
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
    data: FriendNoteData,
  ) {
    this.logger.debug({ friendExternalId, noteExternalId }, 'Updating note');

    return withTransaction(this.db, (client) =>
      this.updateWithin(client, userExternalId, friendExternalId, noteExternalId, data),
    );
  }

  private async updateWithin(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
    data: FriendNoteData,
  ) {
    const friendId = await this.resolveFriendId(client, userExternalId, friendExternalId);
    const [note] = await getFriendNoteInternalId.run(
      { userExternalId, friendExternalId, noteExternalId },
      client,
    );
    if (note === undefined) {
      throw new ResourceNotFoundError('Note', noteExternalId);
    }
    const refs = await this.resolveRefs(client, userExternalId, friendExternalId, data, {
      externalId: noteExternalId,
      id: note.id,
    });

    let updated: { external_id: string }[];
    try {
      updated = await updateFriendNote.run(
        { userExternalId, friendId, noteId: note.id, content: data.content.trim(), ...refs },
        client,
      );
    } catch (error) {
      throw toUniqueViolationError(error, SUPERSEDE_CONFLICTS);
    }
    if (updated.length === 0) {
      throw new ResourceNotFoundError('Note', noteExternalId);
    }

    return this.readNote(client, userExternalId, friendExternalId, noteExternalId);
  }

  /** A newer note that superseded the deleted one loses its supersede link. */
  public async delete(userExternalId: string, friendExternalId: string, noteExternalId: string) {
    this.logger.debug({ friendExternalId, noteExternalId }, 'Deleting note');

    const deleted = await deleteFriendNote.run(
      { userExternalId, friendExternalId, noteExternalId },
      this.db,
    );
    if (deleted.length === 0) {
      throw new ResourceNotFoundError('Note', noteExternalId);
    }
  }

  private async resolveFriendId(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
  ) {
    const [friend] = await getFriendInternalId.run({ userExternalId, friendExternalId }, client);
    if (friend === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }
    return friend.id;
  }

  /**
   * Resolve the external ids in `data` to internal ids of the same user.
   *
   * The encounter does not have to include this friend: the friend that a note
   * is about usually was not present when the user heard it.
   */
  private async resolveRefs(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    data: FriendNoteData,
    current: CurrentNote | null,
  ) {
    let encounterId: number | null = null;
    if (data.encounterId !== undefined && data.encounterId !== null) {
      const [encounter] = await getEncounterInternalId.run(
        { userExternalId, encounterExternalId: data.encounterId },
        client,
      );
      if (encounter === undefined) {
        throw new EncounterNotFoundError(data.encounterId);
      }
      encounterId = encounter.id;
    }

    let sourceFriendId: number | null = null;
    if (data.sourceFriendId !== undefined && data.sourceFriendId !== null) {
      if (data.sourceFriendId === friendExternalId) {
        throw new ValidationError('A note cannot name its own friend as the source');
      }
      sourceFriendId = await this.resolveFriendId(client, userExternalId, data.sourceFriendId);
    }

    let supersedesNoteId: number | null = null;
    if (data.supersedesNoteId !== undefined && data.supersedesNoteId !== null) {
      if (data.supersedesNoteId === current?.externalId) {
        throw new ValidationError('A note cannot supersede itself');
      }
      const [target] = await getFriendNoteInternalId.run(
        { userExternalId, friendExternalId, noteExternalId: data.supersedesNoteId },
        client,
      );
      if (target === undefined) {
        throw new ResourceNotFoundError('Superseded note', data.supersedesNoteId);
      }
      if (current !== null && target.id > current.id) {
        throw new ValidationError('A note can only supersede an older note');
      }
      supersedesNoteId = target.id;
    }

    return { encounterId, sourceFriendId, supersedesNoteId } satisfies ResolvedNoteRefs;
  }

  private async readNote(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
  ) {
    const [row] = await getFriendNotes.run(
      { userExternalId, friendExternalId, noteExternalId },
      client,
    );
    if (row === undefined) {
      throw new ResourceNotFoundError('Note', noteExternalId);
    }
    return this.mapRow(row);
  }

  private mapRow(row: IGetFriendNotesResult) {
    return {
      id: row.external_id,
      content: row.content,
      encounter:
        row.encounter_external_id === null || row.encounter_date === null
          ? null
          : {
              id: row.encounter_external_id,
              title: row.encounter_title,
              encounterType: EncounterTypeSchema.assert(row.encounter_type),
              encounterDate: formatDateOnly(row.encounter_date),
            },
      sourceFriend:
        row.source_friend_external_id === null || row.source_friend_display_name === null
          ? null
          : {
              id: row.source_friend_external_id,
              displayName: row.source_friend_display_name,
              photoThumbnailUrl: row.source_friend_photo_thumbnail_url ?? undefined,
            },
      supersedesNoteId: row.supersedes_note_external_id,
      supersededByNoteId: row.superseded_by_note_external_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    } satisfies FriendNoteResponse;
  }
}
