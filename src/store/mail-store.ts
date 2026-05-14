import { create } from "zustand";
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
};

export const useMailStore = create<MailState>((set, get) => ({
  accounts: [],
  threads: [],
  selectedMessages: [],
  syncStatus: "idle",
  searchQuery: "",
  error: null,
  notifiedThreadIds: new Set(),
  setAccounts: (accounts) => set({ accounts }),
  setThreads: (threads) => set({ threads }),
  setSelectedMessages: (messages) => set({ selectedMessages: messages }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setError: (error) => set({ error }),
  markNotified: (threadId) =>
    set((state) => ({
      notifiedThreadIds: new Set(state.notifiedThreadIds).add(threadId)
    })),
  hasNotified: (threadId) => get().notifiedThreadIds.has(threadId)
}));
