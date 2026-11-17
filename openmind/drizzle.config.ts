import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './core/db/schema.ts',
  out: './core/db/migrations',
  dialect: 'turso',
  dbCredentials: { url: process.env.DATABASE_URL || 'file:.data/openmind.db' },
});
