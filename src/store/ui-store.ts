import { create } from "zustand";
import type { MailFolder } from "@/types/email";

type UIState = {
  selectedThreadId: string | null;
  activeFolder: MailFolder;
  activeAccountFilter: string | null;
  activeView: "mail" | "settings";
  isCommandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  setSelectedThreadId: (threadId: string | null) => void;
  setActiveFolder: (folder: MailFolder) => void;
  setActiveAccountFilter: (accountId: string | null) => void;
  toggleAccountFilter: (accountId: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  toggleCommandPalette: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

const SELECTED_FOLDER_KEY = "syncora:selected-folder";
const mailFolders: MailFolder[] = ["unified", "inbox", "starred", "sent", "trash", "archive"];

function initialFolder(): MailFolder {
  const stored = window.localStorage.getItem(SELECTED_FOLDER_KEY);
  return mailFolders.includes(stored as MailFolder) ? (stored as MailFolder) : "unified";
}

/**
 * Stores navigation, folder, settings, command palette, and sidebar UI state.
 */
export const useUIStore = create<UIState>((set) => ({
  selectedThreadId: null,
  activeFolder: initialFolder(),
  activeAccountFilter: null,
  activeView: "mail",
  isCommandPaletteOpen: false,
  sidebarCollapsed: false,
  setSelectedThreadId: (threadId) =>
    set((state) => (state.selectedThreadId === threadId ? state : { selectedThreadId: threadId })),
  setActiveFolder: (activeFolder) =>
    set((state) => {
      if (state.activeFolder === activeFolder) return state;
      window.localStorage.setItem(SELECTED_FOLDER_KEY, activeFolder);
      return { activeFolder, selectedThreadId: null, activeView: "mail" };
    }),
  setActiveAccountFilter: (activeAccountFilter) => set({ activeAccountFilter, selectedThreadId: null, activeView: "mail" }),
  toggleAccountFilter: (accountId) =>
    set((state) => ({
      activeAccountFilter: state.activeAccountFilter === accountId ? null : accountId,
      selectedThreadId: null,
      activeView: "mail"
    })),
  openSettings: () => set({ activeView: "settings" }),
  closeSettings: () => set({ activeView: "mail" }),
  setCommandPaletteOpen: (isOpen) =>
    set((state) => (state.isCommandPaletteOpen === isOpen ? state : { isCommandPaletteOpen: isOpen })),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setSidebarCollapsed: (sidebarCollapsed) => set((state) => (state.sidebarCollapsed === sidebarCollapsed ? state : { sidebarCollapsed })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));

/**
 * Provides the small command palette API used by app-level keyboard handlers.
 */
export function useCommandPalette() {
  const isOpen = useUIStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggle = useUIStore((state) => state.toggleCommandPalette);

  return { isOpen, setOpen, toggle };
}
