import pg from "pg";

const { Pool } = pg;

let pool;

export function createPool(connectionString) {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000
  });

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool is not initialized.");
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
