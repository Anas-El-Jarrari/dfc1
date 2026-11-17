import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

export const DB_URL = process.env.DATABASE_URL || 'file:.data/openmind.db';

// File databases may not have been migrated yet during a cold start or production build.
if (DB_URL.startsWith('file:') && DB_URL !== 'file::memory:') {
  const file = decodeURIComponent(DB_URL.slice('file:'.length).split('?')[0]);
  mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

// Locally a file; in production e.g. a Turso database (libsql://…) with DATABASE_AUTH_TOKEN.
const client = createClient({ url: DB_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
// SQLite ignores foreign keys (and "on delete cascade") unless this is switched on per connection.
// WAL lets readers and a writer work at the same time; busy_timeout makes a writer wait for a lock instead of failing.
void client.executeMultiple('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

export const db = drizzle(client, { schema });
