import {
  getCachedMessages,
  getCachedThread,
  hasThread,
  listAccounts,
  listCachedThreads,
  markAccountSynced,
  searchCachedThreads,
  upsertAccount,
  upsertThread
} from "@/database/repositories";
import { getGmailThreadFull, getGmailThreadMetadata, listGmailThreadIds } from "@/services/gmail/native-client";
import { normalizeGmailThread } from "@/services/gmail/normalize";
import { notifyNewThread } from "@/services/notifications/notifications";
import { filterThreadsByFolder } from "@/lib/mail-folders";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import type { EmailAccount, EmailThread } from "@/types/email";

let workspaceLoadRequestId = 0;
let selectedMessagesRequestId = 0;
let syncPromise: Promise<void> | null = null;
let lastSyncStartedAt = 0;
const MIN_SYNC_INTERVAL_MS = 30_000;

export async function loadCachedWorkspace(query = "") {
  const requestId = ++workspaceLoadRequestId;
  const [accounts, threads] = await Promise.all([
    listAccounts(),
    query.trim() ? searchCachedThreads(query) : listCachedThreads()
  ]);

  if (requestId !== workspaceLoadRequestId) {
    return { accounts, threads };
  }

  useMailStore.getState().setAccounts(accounts);
  useMailStore.getState().setThreads(threads);
  hydrateSelectedThread(threads);
  return { accounts, threads };
}

export async function connectAndPersistAccount(account: EmailAccount) {
  const completeAccount = {
    ...account,
    provider: "gmail" as const,
    lastSyncedAt: new Date().toISOString()
  };
  await upsertAccount(completeAccount);
  await loadCachedWorkspace();
  return completeAccount;
}

export async function syncAllAccounts(force = false) {
  if (syncPromise) return syncPromise;
  if (!force && Date.now() - lastSyncStartedAt < MIN_SYNC_INTERVAL_MS) return Promise.resolve();

  syncPromise = runSyncAllAccounts().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function runSyncAllAccounts() {
  lastSyncStartedAt = Date.now();
  const store = useMailStore.getState();
  store.setSyncStatus("syncing");
  store.setError(null);

  try {
    const accounts = await listAccounts();
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        await syncAccount(account);
      } catch (error) {
        errors.push(userFacingError(error, `Sync failed for ${account.email}.`));
      }

      await yieldToUI();
    }

    await loadCachedWorkspace(store.searchQuery);
    if (errors.length) {
      store.setSyncStatus("error");
      store.setError({ message: errors[0] });
    } else {
      store.setSyncStatus("idle");
    }
  } catch (error) {
    store.setSyncStatus("error");
    store.setError({ message: userFacingError(error, "Sync failed.") });
  }
}

export async function syncAccount(account: EmailAccount) {
  const response = await listGmailThreadIds(account.id, 20);
  const threadIds = response.threads?.map((thread) => thread.id) ?? [];
  const errors: string[] = [];

  for (const threadId of threadIds) {
    try {
      const gmailThread = await getGmailThreadMetadata(account.id, threadId);
      const normalized = normalizeGmailThread(account, gmailThread);
      if (!normalized) continue;

      const existed = await hasThread(normalized.thread.id);
      await upsertThread(normalized.thread, normalized.messages);
      if (!existed && normalized.thread.unread) {
        await notifyOnce(normalized.thread);
      }
    } catch (error) {
      errors.push(userFacingError(error, `Could not sync Gmail thread ${threadId}.`));
    }

    await yieldToUI();
  }

  await markAccountSynced(account.id);

  if (errors.length) {
    throw new Error(errors[0]);
  }
}

export async function loadMessagesForSelectedThread(threadId: string | null) {
  const requestId = ++selectedMessagesRequestId;

  if (!threadId) {
    useMailStore.getState().setSelectedMessages([]);
    return [];
  }

  let messages = await getCachedMessages(threadId);

  try {
    if (requestId !== selectedMessagesRequestId || useUIStore.getState().selectedThreadId !== threadId) {
      return messages;
    }

    if (messages.length === 0 || messages.every((message) => !hasMessageBody(message))) {
      const thread = await getCachedThread(threadId);
      const account = useMailStore.getState().accounts.find((item) => item.id === thread?.accountId);

      if (thread && account) {
        const gmailThread = await getGmailThreadFull(account.id, thread.gmailThreadId);
        const normalized = normalizeGmailThread(account, gmailThread);

        if (normalized) {
          await upsertThread(normalized.thread, normalized.messages);
          messages = normalized.messages;
        }
      }
    }
  } catch (error) {
    useMailStore.getState().setError({
      message: userFacingError(error, "Could not load this Gmail thread.")
    });
  }

  if (requestId === selectedMessagesRequestId && useUIStore.getState().selectedThreadId === threadId) {
    useMailStore.getState().setSelectedMessages(messages);
  }
  return messages;
}

function hydrateSelectedThread(threads: EmailThread[]) {
  const ui = useUIStore.getState();
  const visibleThreads = filterThreadsByFolder(threads, ui.activeFolder);
  const selectedStillExists = visibleThreads.some((thread) => thread.id === ui.selectedThreadId);
  const nextThreadId = selectedStillExists ? ui.selectedThreadId : visibleThreads[0]?.id ?? null;

  if (nextThreadId) {
    ui.setSelectedThreadId(nextThreadId);
    void loadMessagesForSelectedThread(nextThreadId);
  } else {
    ui.setSelectedThreadId(null);
    useMailStore.getState().setSelectedMessages([]);
  }
}

async function notifyOnce(thread: EmailThread) {
  const store = useMailStore.getState();
  if (store.hasNotified(thread.id)) return;
  await notifyNewThread(thread);
  store.markNotified(thread.id);
}

function yieldToUI() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function hasMessageBody(message: { bodyHtml: string; bodyText: string }) {
  return Boolean(message.bodyHtml.trim() || message.bodyText.trim());
}

function userFacingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/oauth|token|permission|unauthorized|forbidden|invalid_grant/i.test(message)) {
    return "Gmail authorization needs attention. Reconnect the account and try again.";
  }
  if (/timeout|timed out|network|offline|temporarily unavailable|10035|would block/i.test(message)) {
    return "Gmail is temporarily unreachable. Check your connection and retry sync.";
  }
  if (/quota|rate|429|503|unavailable/i.test(message)) {
    return "Gmail is busy right now. Syncora will retry when the service is available.";
  }
  return fallback;
}
