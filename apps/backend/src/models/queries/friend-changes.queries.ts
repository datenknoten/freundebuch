/** Types generated for queries found in "src/models/queries/friend-changes.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'PruneFriendChanges' parameters type */
export type IPruneFriendChangesParams = void;

/** 'PruneFriendChanges' return type */
export interface IPruneFriendChangesResult {
  user_id: number;
}

/** 'PruneFriendChanges' query type */
export interface IPruneFriendChangesQuery {
  params: IPruneFriendChangesParams;
  result: IPruneFriendChangesResult;
}

const pruneFriendChangesIR: any = {"usedParamSet":{},"params":[],"statement":"-- Append-only CardDAV sync log. A client that has not synced for 90 days has to\n-- resync from scratch anyway, so keeping older rows only grows the table.\n--\n-- Deleting a tombstone destroys information a client may still ask for, so the\n-- sweep records the highest id it removed per user. `getChangesForAddressBook`\n-- answers any token at or below that watermark with a full resync (required by\n-- RFC 6578 and SabreDAV's SyncSupport contract for an expired token), and the\n-- advertised token is floored at it so it cannot regress to sync-0 once a\n-- user's last log row is gone.\nWITH pruned AS (\n  DELETE FROM friends.friend_changes\n  WHERE changed_at < now() - interval '90 days'\n  RETURNING user_id, id\n),\nhigh_water AS (\n  SELECT user_id, MAX(id) AS pruned_through_id\n  FROM pruned\n  GROUP BY user_id\n)\nINSERT INTO friends.friend_changes_pruned (user_id, pruned_through_id)\nSELECT user_id, pruned_through_id\nFROM high_water\nON CONFLICT (user_id) DO UPDATE\n  SET pruned_through_id = GREATEST(\n        friends.friend_changes_pruned.pruned_through_id,\n        EXCLUDED.pruned_through_id\n      )\nRETURNING user_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Append-only CardDAV sync log. A client that has not synced for 90 days has to
 * -- resync from scratch anyway, so keeping older rows only grows the table.
 * --
 * -- Deleting a tombstone destroys information a client may still ask for, so the
 * -- sweep records the highest id it removed per user. `getChangesForAddressBook`
 * -- answers any token at or below that watermark with a full resync (required by
 * -- RFC 6578 and SabreDAV's SyncSupport contract for an expired token), and the
 * -- advertised token is floored at it so it cannot regress to sync-0 once a
 * -- user's last log row is gone.
 * WITH pruned AS (
 *   DELETE FROM friends.friend_changes
 *   WHERE changed_at < now() - interval '90 days'
 *   RETURNING user_id, id
 * ),
 * high_water AS (
 *   SELECT user_id, MAX(id) AS pruned_through_id
 *   FROM pruned
 *   GROUP BY user_id
 * )
 * INSERT INTO friends.friend_changes_pruned (user_id, pruned_through_id)
 * SELECT user_id, pruned_through_id
 * FROM high_water
 * ON CONFLICT (user_id) DO UPDATE
 *   SET pruned_through_id = GREATEST(
 *         friends.friend_changes_pruned.pruned_through_id,
 *         EXCLUDED.pruned_through_id
 *       )
 * RETURNING user_id
 * ```
 */
export const pruneFriendChanges = new PreparedQuery<IPruneFriendChangesParams,IPruneFriendChangesResult>(pruneFriendChangesIR);


