/** Types generated for queries found in "src/models/queries/friend-changes.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'PruneFriendChanges' parameters type */
export type IPruneFriendChangesParams = void;

/** 'PruneFriendChanges' return type */
export type IPruneFriendChangesResult = void;

/** 'PruneFriendChanges' query type */
export interface IPruneFriendChangesQuery {
  params: IPruneFriendChangesParams;
  result: IPruneFriendChangesResult;
}

const pruneFriendChangesIR: any = {"usedParamSet":{},"params":[],"statement":"-- Append-only CardDAV sync log. A client that has not synced for 90 days has to\n-- resync from scratch anyway, so keeping older rows only grows the table.\nDELETE FROM friends.friend_changes\nWHERE changed_at < now() - interval '90 days'"};

/**
 * Query generated from SQL:
 * ```
 * -- Append-only CardDAV sync log. A client that has not synced for 90 days has to
 * -- resync from scratch anyway, so keeping older rows only grows the table.
 * DELETE FROM friends.friend_changes
 * WHERE changed_at < now() - interval '90 days'
 * ```
 */
export const pruneFriendChanges = new PreparedQuery<IPruneFriendChangesParams,IPruneFriendChangesResult>(pruneFriendChangesIR);


