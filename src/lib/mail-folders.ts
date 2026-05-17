import type { EmailThread, MailFolder } from "@/types/email";

function hasLabel(thread: EmailThread, label: string) {
  return thread.labels.some((item) => item.toLowerCase() === label.toLowerCase());
}

export function threadBelongsToFolder(thread: EmailThread, folder: MailFolder) {
  switch (folder) {
    case "inbox":
      return hasLabel(thread, "INBOX");
    case "starred":
      return thread.starred || hasLabel(thread, "STARRED");
    case "sent":
      return hasLabel(thread, "SENT");
    case "archive":
      return !hasLabel(thread, "INBOX") && !hasLabel(thread, "SENT") && !hasLabel(thread, "TRASH") && !hasLabel(thread, "SPAM");
    case "unified":
    default:
      return true;
  }
}

export function filterThreadsByFolder(threads: EmailThread[], folder: MailFolder) {
  return threads.filter((thread) => threadBelongsToFolder(thread, folder));
}

export function getFolderCounts(threads: EmailThread[]) {
  return {
    unified: threads.length,
    inbox: filterThreadsByFolder(threads, "inbox").length,
    starred: filterThreadsByFolder(threads, "starred").length,
    sent: filterThreadsByFolder(threads, "sent").length,
    archive: filterThreadsByFolder(threads, "archive").length
  } satisfies Record<MailFolder, number>;
}
