import type { EmailThread, MailFolder } from "@/types/email";

function hasLabel(thread: EmailThread, label: string) {
  return thread.labels.some((item) => item.toLowerCase() === label.toLowerCase());
}

/**
 * Determines whether a cached thread belongs in a Syncora folder.
 */
export function threadBelongsToFolder(thread: EmailThread, folder: MailFolder) {
  const trashed = hasLabel(thread, "TRASH");
  if (folder !== "trash" && trashed) return false;

  switch (folder) {
    case "inbox":
      return hasLabel(thread, "INBOX");
    case "starred":
      return thread.starred || hasLabel(thread, "STARRED");
    case "sent":
      return hasLabel(thread, "SENT");
    case "trash":
      return trashed;
    case "archive":
      return !hasLabel(thread, "INBOX") && !hasLabel(thread, "SENT") && !hasLabel(thread, "SPAM");
    case "unified":
    default:
      return true;
  }
}

/**
 * Filters cached threads by the selected workspace folder.
 */
export function filterThreadsByFolder(threads: EmailThread[], folder: MailFolder) {
  return threads.filter((thread) => threadBelongsToFolder(thread, folder));
}

/**
 * Counts cached threads for each sidebar folder.
 */
export function getFolderCounts(threads: EmailThread[]) {
  return {
    unified: threads.length,
    inbox: filterThreadsByFolder(threads, "inbox").length,
    starred: filterThreadsByFolder(threads, "starred").length,
    sent: filterThreadsByFolder(threads, "sent").length,
    trash: filterThreadsByFolder(threads, "trash").length,
    archive: filterThreadsByFolder(threads, "archive").length
  } satisfies Record<MailFolder, number>;
}
