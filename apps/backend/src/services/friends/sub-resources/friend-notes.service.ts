import type {
  EncounterType,
  FriendNoteInput,
  FriendNoteResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
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
import { withTransaction } from '../../../utils/db.js';
import {
  ConflictError,
  EncounterNotFoundError,
  FriendNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { rethrowUniqueViolation } from '../../../utils/pg-errors.js';
import type { SubResourceServiceOptions } from '../../base/sub-resource.service.js';

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

/**
 * FriendNotesService handles timestamped free-text notes about a friend (Epic 15).
 *
 * It does not extend SubResourceService: that base class reports every failure
 * as `null`, but a note write must tell the client which reference failed
 * (unknown encounter, unknown source friend, unknown superseded note). Every
 * method throws a typed error instead.
 */
export class FriendNotesService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: SubResourceServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * List a friend's notes, newest first.
   */
  async list(userExternalId: string, friendExternalId: string): Promise<FriendNoteResponse[]> {
    this.logger.debug({ friendExternalId }, 'Listing notes');

    await this.resolveFriendId(this.db, userExternalId, friendExternalId);
    const rows = await getFriendNotes.run(
      { userExternalId, friendExternalId, noteExternalId: null },
      this.db,
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Add a note to a friend.
   */
  async create(
    userExternalId: string,
    friendExternalId: string,
    input: FriendNoteInput,
  ): Promise<FriendNoteResponse> {
    this.logger.debug({ friendExternalId }, 'Adding note');

    return withTransaction(this.db, async (client) => {
      const friendId = await this.resolveFriendId(client, userExternalId, friendExternalId);
      const refs = await this.resolveRefs(client, userExternalId, friendExternalId, input, null);

      let created: { external_id: string }[];
      try {
        created = await createFriendNote.run(
          { userExternalId, friendId, content: input.content.trim(), ...refs },
          client,
        );
      } catch (error) {
        this.rethrowSupersedeConflict(error);
      }
      const [createdNote] = created;
      if (createdNote === undefined) {
        throw new FriendNotFoundError();
      }

      return this.readNote(client, userExternalId, friendExternalId, createdNote.external_id);
    });
  }

  /**
   * Replace a note. An omitted link field clears the link.
   */
  async update(
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
    input: FriendNoteInput,
  ): Promise<FriendNoteResponse> {
    this.logger.debug({ friendExternalId, noteExternalId }, 'Updating note');

    return withTransaction(this.db, async (client) => {
      const friendId = await this.resolveFriendId(client, userExternalId, friendExternalId);
      const [note] = await getFriendNoteInternalId.run(
        { userExternalId, friendExternalId, noteExternalId },
        client,
      );
      if (note === undefined) {
        throw new ResourceNotFoundError('Note');
      }
      const refs = await this.resolveRefs(client, userExternalId, friendExternalId, input, {
        externalId: noteExternalId,
        id: note.id,
      });

      let updated: { external_id: string }[];
      try {
        updated = await updateFriendNote.run(
          { userExternalId, friendId, noteId: note.id, content: input.content.trim(), ...refs },
          client,
        );
      } catch (error) {
        this.rethrowSupersedeConflict(error);
      }
      if (updated.length === 0) {
        throw new ResourceNotFoundError('Note');
      }

      return this.readNote(client, userExternalId, friendExternalId, noteExternalId);
    });
  }

  /**
   * Delete a note. A newer note that superseded it loses its supersede link.
   */
  async delete(
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
  ): Promise<void> {
    this.logger.debug({ friendExternalId, noteExternalId }, 'Deleting note');

    const deleted = await deleteFriendNote.run(
      { userExternalId, friendExternalId, noteExternalId },
      this.db,
    );
    if (deleted.length === 0) {
      throw new ResourceNotFoundError('Note');
    }
  }

  private async resolveFriendId(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    notFound: () => Error = () => new FriendNotFoundError(),
  ): Promise<number> {
    const [friend] = await getFriendInternalId.run({ userExternalId, friendExternalId }, client);
    if (friend === undefined) {
      throw notFound();
    }
    return friend.id;
  }

  /**
   * Resolve the external ids in `input` to internal ids of the same user.
   *
   * The encounter does not have to include this friend: the friend that a note
   * is about usually was not present when the user heard it.
   */
  private async resolveRefs(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    input: FriendNoteInput,
    current: CurrentNote | null,
  ): Promise<ResolvedNoteRefs> {
    let encounterId: number | null = null;
    if (input.encounter_id !== undefined && input.encounter_id !== null) {
      const [encounter] = await getEncounterInternalId.run(
        { userExternalId, encounterExternalId: input.encounter_id },
        client,
      );
      if (encounter === undefined) {
        throw new EncounterNotFoundError();
      }
      encounterId = encounter.id;
    }

    let sourceFriendId: number | null = null;
    if (input.source_friend_id !== undefined && input.source_friend_id !== null) {
      if (input.source_friend_id === friendExternalId) {
        throw new ValidationError('A note cannot name its own friend as the source');
      }
      sourceFriendId = await this.resolveFriendId(
        client,
        userExternalId,
        input.source_friend_id,
        () => new FriendNotFoundError('Source friend not found'),
      );
    }

    let supersedesNoteId: number | null = null;
    if (input.supersedes_note_id !== undefined && input.supersedes_note_id !== null) {
      if (input.supersedes_note_id === current?.externalId) {
        throw new ValidationError('A note cannot supersede itself');
      }
      const [target] = await getFriendNoteInternalId.run(
        { userExternalId, friendExternalId, noteExternalId: input.supersedes_note_id },
        client,
      );
      if (target === undefined) {
        throw new ResourceNotFoundError('Superseded note');
      }
      if (current !== null && target.id > current.id) {
        throw new ValidationError('A note can only supersede an older note');
      }
      supersedesNoteId = target.id;
    }

    return { encounterId, sourceFriendId, supersedesNoteId };
  }

  private rethrowSupersedeConflict(error: unknown): never {
    rethrowUniqueViolation(error, {
      idx_friend_notes_supersedes_note_id: () =>
        new ConflictError('This note already has a newer version'),
    });
  }

  private async readNote(
    client: pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    noteExternalId: string,
  ): Promise<FriendNoteResponse> {
    const [row] = await getFriendNotes.run(
      { userExternalId, friendExternalId, noteExternalId },
      client,
    );
    if (row === undefined) {
      throw new ResourceNotFoundError('Note');
    }
    return this.mapRow(row);
  }

  private mapRow(row: IGetFriendNotesResult): FriendNoteResponse {
    return {
      id: row.external_id,
      content: row.content,
      encounter:
        row.encounter_external_id === null || row.encounter_date === null
          ? null
          : {
              id: row.encounter_external_id,
              title: row.encounter_title,
              encounterType: row.encounter_type as EncounterType,
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
    };
  }
}
