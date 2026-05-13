import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedClient: Database | null = null;

export function createDbClient(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create a DB client');
  }
  const queryClient = postgres(connectionString, { max: 5, prepare: false });
  return drizzle(queryClient, { schema });
}

export function getDbClient(): Database {
  if (cachedClient) return cachedClient;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  cachedClient = createDbClient(url);
  return cachedClient;
}
