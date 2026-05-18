/**
 * A locally persisted Gmail account connected to Syncora.
 */
export type EmailAccount = {
  id: string;
  provider: "gmail";
  email: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  lastSyncedAt?: string;
};

/**
 * A normalized Gmail thread summary used by folder lists and search.
 */
export type EmailThread = {
  id: string;
  accountId: string;
  gmailThreadId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  labels: string[];
  unread: boolean;
  starred: boolean;
  receivedAt: string;
  messageCount: number;
};

/**
 * A normalized Gmail message body and metadata record.
 */
export type EmailMessage = {
  id: string;
  threadId: string;
  accountId: string;
  gmailMessageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  receivedAt: string;
  attachments: EmailAttachment[];
};

/**
 * Attachment metadata extracted from Gmail message parts.
 */
export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * Workspace-level synchronization status.
 */
export type SyncStatus = "idle" | "syncing" | "error";

/**
 * User-facing sync or workspace error.
 */
export type SyncError = {
  accountId?: string;
  message: string;
};

/**
 * Built-in Syncora mail folders.
 */
export type MailFolder = "unified" | "inbox" | "starred" | "sent" | "trash" | "archive";
