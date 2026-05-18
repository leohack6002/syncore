import Database from "@tauri-apps/plugin-sql";
import { migrations } from "@/database/schema";

let databasePromise: Promise<Database> | null = null;
let initializePromise: Promise<void> | null = null;
const DATABASE_URL = "sqlite:syncora.db";
const SQLITE_BUSY_TIMEOUT_MS = 5_000;

/**
 * Returns the singleton SQLite database connection used by the local cache.
 */
export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }

  return databasePromise;
}

/**
 * Applies database pragmas and migrations once for the current app session.
 */
export async function initializeDatabase() {
  if (initializePromise) return initializePromise;
  initializePromise = runMigrations();
  return initializePromise;
}

async function runMigrations() {
  const db = await getDatabase();
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute("PRAGMA journal_mode = WAL");
  await db.execute(`PRAGMA busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);

  for (const migration of migrations) {
    const marker = `migration_${migration.version}`;
    const applied = await db.select<Array<{ value: string }>>("SELECT value FROM app_settings WHERE key = $1 LIMIT 1", [marker]).catch(() => []);
    if (applied.length) continue;

    for (const statement of migration.sql.split(";").map((item) => item.trim()).filter(Boolean)) {
      await db.execute(statement);
    }
    await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)", [
      marker,
      new Date().toISOString()
    ]);
  }
}
