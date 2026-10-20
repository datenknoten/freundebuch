import type pg from 'pg';

export async function closePool(pool: pg.Pool): Promise<void> {
  await pool.end();
}
