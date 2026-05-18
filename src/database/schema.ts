/**
 * Ordered SQLite migrations for Syncora's local mail cache.
 */
export const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        color TEXT NOT NULL,
        access_token_ref TEXT,
        refresh_token_ref TEXT,
        expires_at INTEGER,
        last_synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_threads (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        gmail_thread_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        preview TEXT NOT NULL,
        labels TEXT NOT NULL DEFAULT '[]',
        unread INTEGER NOT NULL DEFAULT 0,
        starred INTEGER NOT NULL DEFAULT 0,
        received_at TEXT NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, gmail_thread_id)
      );

      CREATE TABLE IF NOT EXISTS email_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        gmail_message_id TEXT NOT NULL,
        from_header TEXT NOT NULL,
        to_header TEXT NOT NULL,
        cc_header TEXT,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_text TEXT NOT NULL,
        received_at TEXT NOT NULL,
        attachments TEXT NOT NULL DEFAULT '[]',
        UNIQUE(thread_id, gmail_message_id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS email_search USING fts5(
        thread_id UNINDEXED,
        account_id UNINDEXED,
        sender_name,
        sender_email,
        subject,
        body_text,
        labels
      );

      CREATE INDEX IF NOT EXISTS idx_threads_received_at ON email_threads(received_at DESC);
      CREATE INDEX IF NOT EXISTS idx_threads_account ON email_threads(account_id);
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON email_messages(thread_id);
    `
  }
] as const;
