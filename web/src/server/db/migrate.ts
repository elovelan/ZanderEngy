import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  const db = getDb();
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  console.log('[db] Migrations applied successfully');
}
