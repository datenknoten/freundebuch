/* @name PruneFriendChanges */
-- Append-only CardDAV sync log. A client that has not synced for 90 days has to
-- resync from scratch anyway, so keeping older rows only grows the table.
DELETE FROM friends.friend_changes
WHERE changed_at < now() - interval '90 days';
