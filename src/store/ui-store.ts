import { create } from "zustand";

type UIState = {
  selectedThreadId: string | null;
  isCommandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  setSelectedThreadId: (threadId: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  toggleCommandPalette: () => void;
  toggleSidebar: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedThreadId: "thread_1",
  isCommandPaletteOpen: false,
  sidebarCollapsed: false,
  setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),
  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));

export function useCommandPalette() {
  const isOpen = useUIStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggle = useUIStore((state) => state.toggleCommandPalette);

  return { isOpen, setOpen, toggle };
}
