export type EmailAccount = {
  id: string;
  provider: "gmail";
  email: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  lastSyncedAt?: string;
};

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

export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type SyncStatus = "idle" | "syncing" | "error";

export type SyncError = {
  accountId?: string;
  message: string;
};

export type MailFolder = "unified" | "inbox" | "starred" | "sent" | "archive";
