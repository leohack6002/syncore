import { getDatabase } from "@/database/client";
import type { EmailAccount, EmailMessage, EmailThread } from "@/types/email";

type AccountRow = {
  id: string;
  provider: EmailAccount["provider"];
  email: string;
  display_name: string;
  avatar_url?: string;
  color: string;
  last_synced_at?: string;
};

type ThreadRow = {
  id: string;
  account_id: string;
  gmail_thread_id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  preview: string;
  labels: string;
  unread: number;
  starred: number;
  received_at: string;
  message_count: number;
};

type MessageRow = {
  id: string;
  thread_id: string;
  account_id: string;
  gmail_message_id: string;
  from_header: string;
  to_header: string;
  cc_header?: string;
  subject: string;
  body_html?: string;
  body_text: string;
  received_at: string;
  attachments: string;
};

function mapAccount(row: AccountRow): EmailAccount {
  return {
    id: row.id,
    provider: row.provider,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    color: row.color,
    lastSyncedAt: row.last_synced_at
  };
}

function mapThread(row: ThreadRow): EmailThread {
  return {
    id: row.id,
    accountId: row.account_id,
    gmailThreadId: row.gmail_thread_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    subject: row.subject,
    preview: row.preview,
    labels: JSON.parse(row.labels || "[]") as string[],
    unread: row.unread === 1,
    starred: row.starred === 1,
    receivedAt: row.received_at,
    messageCount: row.message_count
  };
}

function mapMessage(row: MessageRow): EmailMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    accountId: row.account_id,
    gmailMessageId: row.gmail_message_id,
    from: row.from_header,
    to: JSON.parse(row.to_header || "[]") as string[],
    cc: JSON.parse(row.cc_header || "[]") as string[],
    subject: row.subject,
    bodyHtml: row.body_html ?? "",
    bodyText: row.body_text,
    receivedAt: row.received_at,
    attachments: JSON.parse(row.attachments || "[]")
  };
}

export async function upsertAccount(account: EmailAccount) {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO accounts (id, provider, email, display_name, avatar_url, color, last_synced_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       color = excluded.color,
       last_synced_at = excluded.last_synced_at,
       updated_at = CURRENT_TIMESTAMP`,
    [account.id, account.provider, account.email, account.displayName, account.avatarUrl ?? null, account.color, account.lastSyncedAt ?? null]
  );
}

export async function listAccounts() {
  const db = await getDatabase();
  const rows = await db.select<AccountRow[]>("SELECT * FROM accounts ORDER BY email ASC");
  return rows.map(mapAccount);
}

export async function deleteAccount(accountId: string) {
  const db = await getDatabase();
  await db.execute("DELETE FROM accounts WHERE id = $1", [accountId]);
}

export async function markAccountSynced(accountId: string, syncedAt = new Date().toISOString()) {
  const db = await getDatabase();
  await db.execute("UPDATE accounts SET last_synced_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [syncedAt, accountId]);
}

export async function upsertThread(thread: EmailThread, messages: EmailMessage[]) {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO email_threads (
      id, account_id, gmail_thread_id, sender_name, sender_email, subject, preview, labels,
      unread, starred, received_at, message_count, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      sender_name = excluded.sender_name,
      sender_email = excluded.sender_email,
      subject = excluded.subject,
      preview = excluded.preview,
      labels = excluded.labels,
      unread = excluded.unread,
      starred = excluded.starred,
      received_at = excluded.received_at,
      message_count = excluded.message_count,
      updated_at = CURRENT_TIMESTAMP`,
    [
      thread.id,
      thread.accountId,
      thread.gmailThreadId,
      thread.senderName,
      thread.senderEmail,
      thread.subject,
      thread.preview,
      JSON.stringify(thread.labels),
      thread.unread ? 1 : 0,
      thread.starred ? 1 : 0,
      thread.receivedAt,
      thread.messageCount
    ]
  );

  const cachedMessages = await getCachedMessages(thread.id);
  const searchableBody = messages
    .map((message) => message.bodyText)
    .join("\n\n")
    .trim() || cachedMessages.map((message) => message.bodyText).join("\n\n");

  await db.execute("DELETE FROM email_search WHERE thread_id = $1", [thread.id]);
  await db.execute(
    "INSERT INTO email_search (thread_id, account_id, sender_name, sender_email, subject, body_text, labels) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      thread.id,
      thread.accountId,
      thread.senderName,
      thread.senderEmail,
      thread.subject,
      searchableBody,
      thread.labels.join(" ")
    ]
  );

  for (const message of messages) {
    await db.execute(
      `INSERT INTO email_messages (
        id, thread_id, account_id, gmail_message_id, from_header, to_header, cc_header,
        subject, body_html, body_text, received_at, attachments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(id) DO UPDATE SET
        from_header = excluded.from_header,
        to_header = excluded.to_header,
        cc_header = excluded.cc_header,
        subject = excluded.subject,
        body_html = CASE WHEN excluded.body_html IS NOT NULL AND excluded.body_html != '' THEN excluded.body_html ELSE email_messages.body_html END,
        body_text = CASE WHEN excluded.body_text != '' THEN excluded.body_text ELSE email_messages.body_text END,
        received_at = excluded.received_at,
        attachments = excluded.attachments`,
      [
        message.id,
        message.threadId,
        message.accountId,
        message.gmailMessageId,
        message.from,
        JSON.stringify(message.to),
        JSON.stringify(message.cc ?? []),
        message.subject,
        message.bodyHtml,
        message.bodyText,
        message.receivedAt,
        JSON.stringify(message.attachments)
      ]
    );
  }
}

export async function listCachedThreads(limit = 100) {
  const db = await getDatabase();
  const rows = await db.select<ThreadRow[]>(
    "SELECT * FROM email_threads ORDER BY datetime(received_at) DESC LIMIT $1",
    [limit]
  );
  return rows.map(mapThread);
}

export async function getCachedThread(threadId: string) {
  const db = await getDatabase();
  const rows = await db.select<ThreadRow[]>("SELECT * FROM email_threads WHERE id = $1 LIMIT 1", [threadId]);
  return rows[0] ? mapThread(rows[0]) : null;
}

export async function updateThreadStarred(threadId: string, starred: boolean) {
  const db = await getDatabase();
  const thread = await getCachedThread(threadId);
  if (!thread) return null;

  const labels = starred
    ? Array.from(new Set([...thread.labels, "STARRED"]))
    : thread.labels.filter((label) => label.toLowerCase() !== "starred");

  await db.execute(
    `UPDATE email_threads
     SET starred = $1, labels = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [starred ? 1 : 0, JSON.stringify(labels), threadId]
  );
  await db.execute("UPDATE email_search SET labels = $1 WHERE thread_id = $2", [labels.join(" "), threadId]);

  return { ...thread, starred, labels };
}

export async function getCachedMessages(threadId: string) {
  const db = await getDatabase();
  const rows = await db.select<MessageRow[]>(
    "SELECT * FROM email_messages WHERE thread_id = $1 ORDER BY datetime(received_at) ASC",
    [threadId]
  );
  return rows.map(mapMessage);
}

export async function searchCachedThreads(query: string, limit = 100) {
  if (!query.trim()) return listCachedThreads(limit);
  const db = await getDatabase();
  const rows = await db.select<ThreadRow[]>(
    `SELECT t.*
     FROM email_search s
     JOIN email_threads t ON t.id = s.thread_id
     WHERE email_search MATCH $1
     ORDER BY rank
     LIMIT $2`,
    [`${query.trim()}*`, limit]
  );
  return rows.map(mapThread);
}

export async function hasThread(threadId: string) {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>("SELECT COUNT(*) as count FROM email_threads WHERE id = $1", [threadId]);
  return Number(rows[0]?.count ?? 0) > 0;
}
