import {
  getCachedMessages,
  hasThread,
  listAccounts,
  listCachedThreads,
  markAccountSynced,
  searchCachedThreads,
  upsertAccount,
  upsertThread
} from "@/database/repositories";
import { getGmailThread, listGmailThreadIds } from "@/services/gmail/native-client";
import { normalizeGmailThread } from "@/services/gmail/normalize";
import { notifyNewThread } from "@/services/notifications/notifications";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import type { EmailAccount, EmailThread } from "@/types/email";

export async function loadCachedWorkspace(query = "") {
  const [accounts, threads] = await Promise.all([
    listAccounts(),
    query.trim() ? searchCachedThreads(query) : listCachedThreads()
  ]);

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

export async function syncAllAccounts() {
  const store = useMailStore.getState();
  store.setSyncStatus("syncing");
  store.setError(null);

  try {
    const accounts = await listAccounts();
    for (const account of accounts) {
      await syncAccount(account);
    }
    await loadCachedWorkspace(store.searchQuery);
    store.setSyncStatus("idle");
  } catch (error) {
    store.setSyncStatus("error");
    store.setError({ message: error instanceof Error ? error.message : "Sync failed." });
  }
}

export async function syncAccount(account: EmailAccount) {
  const response = await listGmailThreadIds(account.id, 35);
  const threadIds = response.threads?.map((thread) => thread.id) ?? [];

  for (const threadId of threadIds) {
    const gmailThread = await getGmailThread(account.id, threadId);
    const normalized = normalizeGmailThread(account, gmailThread);
    if (!normalized) continue;

    const existed = await hasThread(normalized.thread.id);
    await upsertThread(normalized.thread, normalized.messages);
    if (!existed && normalized.thread.unread) {
      await notifyOnce(normalized.thread);
    }
  }

  await markAccountSynced(account.id);
}

export async function loadMessagesForSelectedThread(threadId: string | null) {
  if (!threadId) {
    useMailStore.getState().setSelectedMessages([]);
    return [];
  }

  const messages = await getCachedMessages(threadId);
  useMailStore.getState().setSelectedMessages(messages);
  return messages;
}

function hydrateSelectedThread(threads: EmailThread[]) {
  const ui = useUIStore.getState();
  const selectedStillExists = threads.some((thread) => thread.id === ui.selectedThreadId);
  const nextThreadId = selectedStillExists ? ui.selectedThreadId : threads[0]?.id;

  if (nextThreadId) {
    ui.setSelectedThreadId(nextThreadId);
    void loadMessagesForSelectedThread(nextThreadId);
  } else {
    useMailStore.getState().setSelectedMessages([]);
  }
}

async function notifyOnce(thread: EmailThread) {
  const store = useMailStore.getState();
  if (store.hasNotified(thread.id)) return;
  await notifyNewThread(thread);
  store.markNotified(thread.id);
}
