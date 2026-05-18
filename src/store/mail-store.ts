import { create } from "zustand";
import { deleteThreadPermanently, emptyTrashThreads, updateThreadLabels, updateThreadStarred, updateThreadUnread } from "@/database/repositories";
import type { EmailAccount, EmailMessage, EmailThread, SyncError, SyncStatus } from "@/types/email";

type MailState = {
  accounts: EmailAccount[];
  threads: EmailThread[];
  selectedMessages: EmailMessage[];
  selectedMessagesLoading: boolean;
  syncStatus: SyncStatus;
  searchQuery: string;
  error: SyncError | null;
  canLoadMoreThreads: boolean;
  loadingMoreThreads: boolean;
  setAccounts: (accounts: EmailAccount[]) => void;
  setThreads: (threads: EmailThread[]) => void;
  setSelectedMessages: (messages: EmailMessage[]) => void;
  setSelectedMessagesLoading: (loading: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: SyncError | null) => void;
  setCanLoadMoreThreads: (canLoadMore: boolean) => void;
  setLoadingMoreThreads: (loading: boolean) => void;
  setThreadStarred: (threadId: string, starred: boolean) => void;
  toggleThreadStarred: (threadId: string) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  moveThreadToTrash: (threadId: string) => Promise<void>;
  moveThreadToInbox: (threadId: string) => Promise<void>;
  markThreadUnread: (threadId: string, unread: boolean) => Promise<void>;
  deleteThreadPermanently: (threadId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
};

function labelEquals(label: string, value: string) {
  return label.toLowerCase() === value.toLowerCase();
}

function applyStarredState(thread: EmailThread, starred: boolean): EmailThread {
  const labels = starred
    ? Array.from(new Set([...thread.labels, "STARRED"]))
    : thread.labels.filter((label) => !labelEquals(label, "STARRED"));

  return { ...thread, starred, labels };
}

function applyLabels(thread: EmailThread, labels: string[]): EmailThread {
  return {
    ...thread,
    labels,
    starred: labels.some((label) => labelEquals(label, "STARRED"))
  };
}

/**
 * Stores cached mail data and optimistic thread actions shared across the workspace.
 */
export const useMailStore = create<MailState>((set, get) => ({
  accounts: [],
  threads: [],
  selectedMessages: [],
  selectedMessagesLoading: false,
  syncStatus: "idle",
  searchQuery: "",
  error: null,
  canLoadMoreThreads: false,
  loadingMoreThreads: false,
  setAccounts: (accounts) => set((state) => (state.accounts === accounts ? state : { accounts })),
  setThreads: (threads) => set((state) => (state.threads === threads ? state : { threads })),
  setSelectedMessages: (messages) => set((state) => (state.selectedMessages === messages ? state : { selectedMessages: messages })),
  setSelectedMessagesLoading: (selectedMessagesLoading) =>
    set((state) => (state.selectedMessagesLoading === selectedMessagesLoading ? state : { selectedMessagesLoading })),
  setSyncStatus: (syncStatus) => set((state) => (state.syncStatus === syncStatus ? state : { syncStatus })),
  setSearchQuery: (searchQuery) => set((state) => (state.searchQuery === searchQuery ? state : { searchQuery })),
  setError: (error) => set((state) => (state.error === error ? state : { error })),
  setCanLoadMoreThreads: (canLoadMoreThreads) => set((state) => (state.canLoadMoreThreads === canLoadMoreThreads ? state : { canLoadMoreThreads })),
  setLoadingMoreThreads: (loadingMoreThreads) => set((state) => (state.loadingMoreThreads === loadingMoreThreads ? state : { loadingMoreThreads })),
  setThreadStarred: (threadId, starred) =>
    set((state) => ({
      threads: state.threads.map((thread) => (thread.id === threadId ? applyStarredState(thread, starred) : thread))
    })),
  toggleThreadStarred: async (threadId) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread) return;

    const nextStarred = !thread.starred;
    get().setThreadStarred(threadId, nextStarred);

    try {
      await updateThreadStarred(threadId, nextStarred);
    } catch (error) {
      get().setThreadStarred(threadId, thread.starred);
      get().setError({
        message: error instanceof Error ? error.message : "Could not update this message."
      });
    }
  },
  archiveThread: async (threadId) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread) return;

    const nextLabels = thread.labels.filter((label) => !labelEquals(label, "INBOX"));
    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? applyLabels(item, nextLabels) : item))
    }));

    try {
      await updateThreadLabels(threadId, nextLabels);
    } catch (error) {
      set((state) => ({
        threads: state.threads.map((item) => (item.id === threadId ? thread : item))
      }));
      get().setError({
        message: error instanceof Error ? error.message : "Could not archive this message."
      });
    }
  },
  moveThreadToTrash: async (threadId) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread) return;

    const nextLabels = Array.from(new Set([...thread.labels.filter((label) => !labelEquals(label, "INBOX")), "TRASH"]));
    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? applyLabels(item, nextLabels) : item))
    }));

    try {
      await updateThreadLabels(threadId, nextLabels);
    } catch (error) {
      set((state) => ({
        threads: state.threads.map((item) => (item.id === threadId ? thread : item))
      }));
      get().setError({
        message: error instanceof Error ? error.message : "Could not move this message to trash."
      });
    }
  },
  moveThreadToInbox: async (threadId) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread) return;

    const nextLabels = Array.from(new Set([...thread.labels.filter((label) => !labelEquals(label, "TRASH")), "INBOX"]));
    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? applyLabels(item, nextLabels) : item))
    }));

    try {
      await updateThreadLabels(threadId, nextLabels);
    } catch (error) {
      set((state) => ({ threads: state.threads.map((item) => (item.id === threadId ? thread : item)) }));
      get().setError({ message: error instanceof Error ? error.message : "Could not move this message to inbox." });
    }
  },
  markThreadUnread: async (threadId, unread) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread || thread.unread === unread) return;

    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? { ...item, unread } : item))
    }));

    try {
      await updateThreadUnread(threadId, unread);
    } catch (error) {
      set((state) => ({ threads: state.threads.map((item) => (item.id === threadId ? thread : item)) }));
      get().setError({ message: error instanceof Error ? error.message : "Could not update read state." });
    }
  },
  deleteThreadPermanently: async (threadId) => {
    const previousThreads = get().threads;
    set((state) => ({ threads: state.threads.filter((thread) => thread.id !== threadId) }));
    try {
      await deleteThreadPermanently(threadId);
    } catch (error) {
      set({ threads: previousThreads });
      get().setError({ message: error instanceof Error ? error.message : "Could not permanently delete this message." });
    }
  },
  emptyTrash: async () => {
    const previousThreads = get().threads;
    set((state) => ({ threads: state.threads.filter((thread) => !thread.labels.some((label) => labelEquals(label, "TRASH"))) }));
    try {
      await emptyTrashThreads();
    } catch (error) {
      set({ threads: previousThreads });
      get().setError({ message: error instanceof Error ? error.message : "Could not empty trash." });
    }
  }
}));
