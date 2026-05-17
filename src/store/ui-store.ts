import { create } from "zustand";
import type { MailFolder } from "@/types/email";

type UIState = {
  selectedThreadId: string | null;
  activeFolder: MailFolder;
  isCommandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  setSelectedThreadId: (threadId: string | null) => void;
  setActiveFolder: (folder: MailFolder) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  toggleCommandPalette: () => void;
  toggleSidebar: () => void;
};

const SELECTED_FOLDER_KEY = "syncora:selected-folder";
const mailFolders: MailFolder[] = ["unified", "inbox", "starred", "sent", "archive"];

function initialFolder(): MailFolder {
  const stored = window.localStorage.getItem(SELECTED_FOLDER_KEY);
  return mailFolders.includes(stored as MailFolder) ? (stored as MailFolder) : "unified";
}

export const useUIStore = create<UIState>((set) => ({
  selectedThreadId: null,
  activeFolder: initialFolder(),
  isCommandPaletteOpen: false,
  sidebarCollapsed: false,
  setSelectedThreadId: (threadId) =>
    set((state) => (state.selectedThreadId === threadId ? state : { selectedThreadId: threadId })),
  setActiveFolder: (activeFolder) =>
    set((state) => {
      if (state.activeFolder === activeFolder) return state;
      window.localStorage.setItem(SELECTED_FOLDER_KEY, activeFolder);
      return { activeFolder, selectedThreadId: null };
    }),
  setCommandPaletteOpen: (isOpen) =>
    set((state) => (state.isCommandPaletteOpen === isOpen ? state : { isCommandPaletteOpen: isOpen })),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));

export function useCommandPalette() {
  const isOpen = useUIStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggle = useUIStore((state) => state.toggleCommandPalette);

  return { isOpen, setOpen, toggle };
}
