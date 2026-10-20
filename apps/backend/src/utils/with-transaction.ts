import type pg from 'pg';

/**
 * Run `fn` inside a database transaction: BEGIN, then COMMIT on success or
 * ROLLBACK on error. Rollback and release failures are swallowed so they
 * can't mask the original error, and the client is always released.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors to preserve the original error.
    }
    throw error;
  } finally {
    try {
      client.release();
    } catch {
      // Prevent a release failure from masking the original error.
    }
  }
}
