import type pg from 'pg';

export async function closePool(pool: pg.Pool) {
  await pool.end();
}
