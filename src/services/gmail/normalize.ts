import type { GmailMessage, GmailMessagePart, GmailThread } from "@/services/gmail/native-client";
import type { EmailAccount, EmailAttachment, EmailMessage, EmailThread } from "@/types/email";

function headerValue(message: GmailMessage, name: string) {
  return (
    message.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

function decodeBase64Url(value?: string) {
  if (!value) return "";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch {
    return "";
  }
}

function collectBody(part: GmailMessagePart | undefined, mimeType: "text/plain" | "text/html"): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data);
  return part.parts?.map((child) => collectBody(child, mimeType)).find(Boolean) ?? "";
}

function collectAttachments(part: GmailMessagePart | undefined): EmailAttachment[] {
  if (!part) return [];
  const current =
    part.filename && part.body?.attachmentId
      ? [
          {
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType ?? "application/octet-stream",
            size: part.body.size ?? 0
          }
        ]
      : [];
  return [...current, ...(part.parts?.flatMap(collectAttachments) ?? [])];
}

function parseSender(from: string) {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { name: from || "Unknown sender", email: from };
  return {
    name: match[1].replace(/^"|"$/g, "") || match[2],
    email: match[2]
  };
}

export function normalizeGmailThread(account: EmailAccount, gmailThread: GmailThread) {
  const messages = gmailThread.messages ?? [];
  const latest = messages[messages.length - 1];
  if (!latest) return null;

  const from = headerValue(latest, "From");
  const sender = parseSender(from);
  const subject = headerValue(latest, "Subject") || "(No subject)";
  const labels = Array.from(new Set(messages.flatMap((message) => message.labelIds ?? [])));
  const receivedAt = latest.internalDate ? new Date(Number(latest.internalDate)).toISOString() : new Date().toISOString();
  const bodyText = collectBody(latest.payload, "text/plain");

  const thread: EmailThread = {
    id: `${account.id}:${gmailThread.id}`,
    accountId: account.id,
    gmailThreadId: gmailThread.id,
    senderName: sender.name,
    senderEmail: sender.email,
    subject,
    preview: latest.snippet || bodyText.slice(0, 180),
    labels,
    unread: labels.includes("UNREAD"),
    starred: labels.includes("STARRED"),
    receivedAt,
    messageCount: messages.length
  };

  const normalizedMessages: EmailMessage[] = messages.map((message) => {
    const messageSubject = headerValue(message, "Subject") || subject;
    return {
      id: `${account.id}:${message.id}`,
      accountId: account.id,
      threadId: thread.id,
      gmailMessageId: message.id,
      from: headerValue(message, "From"),
      to: headerValue(message, "To")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      cc: headerValue(message, "Cc")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      subject: messageSubject,
      bodyHtml: collectBody(message.payload, "text/html"),
      bodyText: collectBody(message.payload, "text/plain"),
      receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : receivedAt,
      attachments: collectAttachments(message.payload)
    };
  });

  return { thread, messages: normalizedMessages };
}
