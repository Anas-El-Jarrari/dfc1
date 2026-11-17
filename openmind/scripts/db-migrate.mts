import { mkdirSync } from 'node:fs';
import { migrate } from 'drizzle-orm/libsql/migrator';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
mkdirSync('.data', { recursive: true });
const { db } = await import('../core/db/client');
await migrate(db, { migrationsFolder: 'core/db/migrations' });
console.log('Datenbank ist auf dem neuesten Stand.');
