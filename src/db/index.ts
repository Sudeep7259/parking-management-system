import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// Prefer Turso if env vars are present; otherwise fall back to a local SQLite file for dev
const url = process.env.TURSO_CONNECTION_URL || 'file:./.data/dev.sqlite';
const authToken = process.env.TURSO_CONNECTION_URL ? process.env.TURSO_AUTH_TOKEN : undefined;

const client = createClient({
  url,
  // authToken is only required for remote Turso; omit for local file URLs
  ...(authToken ? { authToken } : {}),
});

export const db = drizzle(client, { schema });

export type Database = typeof db;