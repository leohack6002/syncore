import type { EmailAccount, EmailMessage, EmailThread } from "@/types/email";

export const mockAccounts: EmailAccount[] = [
  {
    id: "acc_primary",
    provider: "gmail",
    email: "alex@syncora.dev",
    displayName: "Alex Morgan",
    color: "#2cdaff",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString()
  },
  {
    id: "acc_work",
    provider: "gmail",
    email: "alex@northstar.studio",
    displayName: "Northstar",
    color: "#9b7cff",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString()
  }
];

export const mockThreads: EmailThread[] = Array.from({ length: 80 }, (_, index) => {
  const account = mockAccounts[index % mockAccounts.length];
  const labels = index % 3 === 0 ? ["Design", "MVP"] : index % 4 === 0 ? ["Infra"] : ["Inbox"];

  return {
    id: `thread_${index + 1}`,
    accountId: account.id,
    gmailThreadId: `gmail_${index + 1}`,
    senderName: ["Maya Chen", "Gmail API", "Linear", "Priya Shah", "Tauri Team"][index % 5],
    senderEmail: ["maya@studio.dev", "no-reply@google.com", "updates@linear.app", "priya@product.io", "hello@tauri.app"][index % 5],
    subject: [
      "Syncora product direction and launch checklist",
      "OAuth consent screen verification notes",
      "Inbox virtualization performance pass",
      "Unified workspace review",
      "Desktop notification edge cases"
    ][index % 5],
    preview:
      "Here is the latest pass on the workspace flow, including the search index, account indicators, and reader polish for the first build.",
    labels,
    unread: index % 5 !== 0,
    starred: index % 11 === 0,
    receivedAt: new Date(Date.now() - index * 1000 * 60 * 37).toISOString(),
    messageCount: (index % 4) + 1
  };
});

export const mockMessage: EmailMessage = {
  id: "msg_1",
  threadId: "thread_1",
  from: "Maya Chen <maya@studio.dev>",
  to: ["alex@syncora.dev"],
  subject: "Syncora product direction and launch checklist",
  bodyHtml: "",
  bodyText:
    "The current shell feels fast and focused. Next steps are OAuth completion, SQLite FTS wiring, and inbox sync scheduling. The visual language is landing in the right territory: quiet, precise, and premium.",
  receivedAt: new Date().toISOString()
};
