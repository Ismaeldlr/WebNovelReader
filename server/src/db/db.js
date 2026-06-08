const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'webnovel_hub',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,                  // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Run a single query.
 * Usage: const { rows } = await query('SELECT * FROM novels WHERE id = $1', [id]);
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[db] ${duration}ms — ${text.slice(0, 80)}`);
    }
    return result;
  } catch (err) {
    console.error('[db] Query error:', err.message, '\nQuery:', text);
    throw err;
  }
}

/**
 * Get a client for transactions.
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getClient() {
  return pool.connect();
}

/**
 * Convenience wrapper for transactions.
 * Automatically handles BEGIN / COMMIT / ROLLBACK.
 * Usage: await withTransaction(async (client) => { ... });
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function testConnection() {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    console.log('[db] Connected —', rows[0].now);
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { query, getClient, withTransaction, testConnection, pool };
