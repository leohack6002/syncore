import Database from "@tauri-apps/plugin-sql";
import { migrations } from "@/database/schema";

let databasePromise: Promise<Database> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:syncora.db");
  }

  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  for (const migration of migrations) {
    for (const statement of migration.sql.split(";").map((item) => item.trim()).filter(Boolean)) {
      await db.execute(statement);
    }
    await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)", [
      `migration_${migration.version}`,
      new Date().toISOString()
    ]);
  }
}
