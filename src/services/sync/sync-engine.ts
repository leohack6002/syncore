import {
  getCachedMessages,
  getCachedThread,
  listAccounts,
  listCachedThreads,
  markAccountSynced,
  searchCachedThreads,
  upsertAccount,
  upsertThread,
  upsertThreadsBatch
} from "@/database/repositories";
import { getGmailThreadFull, getGmailThreadMetadata, listGmailThreadIds } from "@/services/gmail/native-client";
import { normalizeGmailThread } from "@/services/gmail/normalize";
import { filterThreadsByFolder } from "@/lib/mail-folders";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import type { EmailAccount, EmailThread } from "@/types/email";

let workspaceLoadRequestId = 0;
let selectedMessagesRequestId = 0;
let syncPromise: Promise<void> | null = null;
let lastSyncStartedAt = 0;
const MIN_SYNC_INTERVAL_MS = 30_000;
const BACKGROUND_GMAIL_THREAD_PAGE_SIZE = 20;
const MANUAL_GMAIL_THREAD_PAGE_SIZE = 50;
const GENERAL_GMAIL_QUERY = "in:anywhere newer_than:30d";
const SENT_GMAIL_QUERY = "in:sent newer_than:30d";
const nextPageTokensByAccount = new Map<string, string>();

/**
 * Loads accounts and cached threads from SQLite into Zustand state.
 */
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
  updateCanLoadMore();
  hydrateSelectedThread(threads);
  return { accounts, threads };
}

/**
 * Persists a newly connected account and refreshes the local workspace state.
 */
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

/**
 * Runs a guarded sync for all connected accounts.
 */
export async function syncAllAccounts(force = false) {
  if (syncPromise) return force ? syncPromise : Promise.resolve();
  if (!force && Date.now() - lastSyncStartedAt < MIN_SYNC_INTERVAL_MS) return Promise.resolve();

  syncPromise = runSyncAllAccounts(force).finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function runSyncAllAccounts(force: boolean) {
  lastSyncStartedAt = Date.now();
  const store = useMailStore.getState();
  store.setSyncStatus("syncing");
  store.setError(null);

  try {
    const accounts = await listAccounts();
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        await syncAccount(account, force ? MANUAL_GMAIL_THREAD_PAGE_SIZE : BACKGROUND_GMAIL_THREAD_PAGE_SIZE);
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

/**
 * Syncs recent metadata for one Gmail account.
 */
export async function syncAccount(account: EmailAccount, maxResults = BACKGROUND_GMAIL_THREAD_PAGE_SIZE) {
  const [response, sentResponse] = await Promise.all([
    listGmailThreadIds(account.id, maxResults, undefined, GENERAL_GMAIL_QUERY),
    listGmailThreadIds(account.id, maxResults, undefined, SENT_GMAIL_QUERY)
  ]);
  setNextPageToken(account.id, response.nextPageToken);
  const threadIds = uniqueThreadIds([
    ...(response.threads?.map((thread) => thread.id) ?? []),
    ...(sentResponse.threads?.map((thread) => thread.id) ?? [])
  ]);
  await syncThreadIds(account, threadIds);
  await markAccountSynced(account.id);
}

/**
 * Loads the next Gmail page for accounts that still have pagination tokens.
 */
export async function loadMoreThreads() {
  const store = useMailStore.getState();
  const accounts = await listAccounts();
  const accountsWithPages = accounts.filter((account) => nextPageTokensByAccount.has(account.id));

  if (!accountsWithPages.length) {
    store.setCanLoadMoreThreads(false);
    return;
  }

  store.setLoadingMoreThreads(true);
  store.setError(null);

  try {
    for (const account of accountsWithPages) {
      const pageToken = nextPageTokensByAccount.get(account.id);
      if (!pageToken) continue;

      const response = await listGmailThreadIds(account.id, MANUAL_GMAIL_THREAD_PAGE_SIZE, pageToken, GENERAL_GMAIL_QUERY);
      setNextPageToken(account.id, response.nextPageToken);
      await syncThreadIds(account, response.threads?.map((thread) => thread.id) ?? []);
      await markAccountSynced(account.id);
      await yieldToUI();
    }

    await loadCachedWorkspace(store.searchQuery);
  } catch (error) {
    store.setError({ message: userFacingError(error, "Could not load more Gmail threads.") });
  } finally {
    store.setLoadingMoreThreads(false);
    updateCanLoadMore();
  }
}

async function syncThreadIds(account: EmailAccount, threadIds: string[]) {
  const errors: string[] = [];
  const normalizedThreads: Array<NonNullable<ReturnType<typeof normalizeGmailThread>>> = [];

  for (const [index, threadId] of threadIds.entries()) {
    try {
      const gmailThread = await getGmailThreadMetadata(account.id, threadId);
      const normalized = normalizeGmailThread(account, gmailThread);
      if (!normalized) continue;
      normalizedThreads.push(normalized);
    } catch (error) {
      errors.push(userFacingError(error, `Could not sync Gmail thread ${threadId}.`));
    }

    if (index % 5 === 4) await yieldToUI();
  }

  if (normalizedThreads.length) {
    await upsertThreadsBatch(normalizedThreads);
  }

  if (errors.length) {
    throw new Error(errors[0]);
  }
}

/**
 * Hydrates messages for the selected thread, fetching full Gmail content when needed.
 */
export async function loadMessagesForSelectedThread(threadId: string | null) {
  const requestId = ++selectedMessagesRequestId;

  if (!threadId) {
    useMailStore.getState().setSelectedMessages([]);
    useMailStore.getState().setSelectedMessagesLoading(false);
    return [];
  }

  useMailStore.getState().setSelectedMessagesLoading(true);
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
    useMailStore.getState().setSelectedMessagesLoading(false);
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
    useMailStore.getState().setSelectedMessagesLoading(false);
  }
}

function setNextPageToken(accountId: string, nextPageToken?: string) {
  if (nextPageToken) {
    nextPageTokensByAccount.set(accountId, nextPageToken);
  } else {
    nextPageTokensByAccount.delete(accountId);
  }
  updateCanLoadMore();
}

function updateCanLoadMore() {
  useMailStore.getState().setCanLoadMoreThreads(nextPageTokensByAccount.size > 0);
}

function uniqueThreadIds(threadIds: string[]) {
  return Array.from(new Set(threadIds));
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
