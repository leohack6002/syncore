import Database from "@tauri-apps/plugin-sql";
import { migrations } from "@/database/schema";

let databasePromise: Promise<Database> | null = null;
let initializePromise: Promise<void> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:syncora.db");
  }

  return databasePromise;
}

export async function initializeDatabase() {
  if (initializePromise) return initializePromise;
  initializePromise = runMigrations();
  return initializePromise;
}

async function runMigrations() {
  const db = await getDatabase();
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute("PRAGMA journal_mode = WAL");
  await db.execute("PRAGMA busy_timeout = 5000");

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
