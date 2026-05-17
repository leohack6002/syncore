import { create } from "zustand";
import { updateThreadStarred } from "@/database/repositories";
import type { EmailAccount, EmailMessage, EmailThread, SyncError, SyncStatus } from "@/types/email";

type MailState = {
  accounts: EmailAccount[];
  threads: EmailThread[];
  selectedMessages: EmailMessage[];
  syncStatus: SyncStatus;
  searchQuery: string;
  error: SyncError | null;
  notifiedThreadIds: Set<string>;
  setAccounts: (accounts: EmailAccount[]) => void;
  setThreads: (threads: EmailThread[]) => void;
  setSelectedMessages: (messages: EmailMessage[]) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: SyncError | null) => void;
  markNotified: (threadId: string) => void;
  hasNotified: (threadId: string) => boolean;
  setThreadStarred: (threadId: string, starred: boolean) => void;
  toggleThreadStarred: (threadId: string) => Promise<void>;
};

function applyStarredState(thread: EmailThread, starred: boolean): EmailThread {
  const labels = starred
    ? Array.from(new Set([...thread.labels, "STARRED"]))
    : thread.labels.filter((label) => label.toLowerCase() !== "starred");

  return { ...thread, starred, labels };
}

export const useMailStore = create<MailState>((set, get) => ({
  accounts: [],
  threads: [],
  selectedMessages: [],
  syncStatus: "idle",
  searchQuery: "",
  error: null,
  notifiedThreadIds: new Set(),
  setAccounts: (accounts) => set((state) => (state.accounts === accounts ? state : { accounts })),
  setThreads: (threads) => set((state) => (state.threads === threads ? state : { threads })),
  setSelectedMessages: (messages) => set((state) => (state.selectedMessages === messages ? state : { selectedMessages: messages })),
  setSyncStatus: (syncStatus) => set((state) => (state.syncStatus === syncStatus ? state : { syncStatus })),
  setSearchQuery: (searchQuery) => set((state) => (state.searchQuery === searchQuery ? state : { searchQuery })),
  setError: (error) => set((state) => (state.error === error ? state : { error })),
  markNotified: (threadId) =>
    set((state) => ({
      notifiedThreadIds: new Set(state.notifiedThreadIds).add(threadId)
    })),
  hasNotified: (threadId) => get().notifiedThreadIds.has(threadId),
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
  }
}));
