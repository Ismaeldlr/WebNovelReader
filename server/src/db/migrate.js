/**
 * migrate.js — run pending SQL migrations in order.
 * Usage: node src/db/migrate.js
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY id'
    );
    const appliedSet = new Set(applied.map(r => r.filename));

    // Get all migration files, sorted
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = files.filter(f => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('[migrate] Nothing to run — schema is up to date.');
      return;
    }

    for (const file of pending) {
      const filepath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filepath, 'utf8');

      console.log(`[migrate] Applying: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ✗ ${file} — ${err.message}`);
        throw err;
      }
    }

    console.log(`[migrate] Done — ${pending.length} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[migrate] Fatal:', err.message);
  process.exit(1);
});
