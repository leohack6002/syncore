import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { InboxList } from "@/features/inbox/InboxList";
import { MailReader } from "@/features/mail-reader/MailReader";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { Sidebar } from "@/components/navigation/Sidebar";
import { filterThreadsByFolder } from "@/lib/mail-folders";
import { loadMessagesForSelectedThread } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";

/**
 * Renders the primary desktop workspace and keyboard shortcuts.
 */
export function AppShell() {
  const threads = useMailStore((state) => state.threads);
  const archiveThread = useMailStore((state) => state.archiveThread);
  const moveThreadToTrash = useMailStore((state) => state.moveThreadToTrash);
  const toggleThreadStarred = useMailStore((state) => state.toggleThreadStarred);
  const markThreadUnread = useMailStore((state) => state.markThreadUnread);
  const activeFolder = useUIStore((state) => state.activeFolder);
  const activeAccountFilter = useUIStore((state) => state.activeAccountFilter);
  const activeView = useUIStore((state) => state.activeView);
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useUIStore((state) => state.setSelectedThreadId);
  const visibleThreads = useMemo(() => {
    const accountThreads = activeAccountFilter ? threads.filter((thread) => thread.accountId === activeAccountFilter) : threads;
    return filterThreadsByFolder(accountThreads, activeFolder);
  }, [activeAccountFilter, activeFolder, threads]);

  useEffect(() => {
    if (activeView === "settings") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as { closest?: (selector: string) => unknown } | null;
      if (target?.closest?.("input, textarea, [contenteditable='true']")) return;
      const currentIndex = visibleThreads.findIndex((thread) => thread.id === selectedThreadId);
      const selected = visibleThreads[currentIndex];

      if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = event.key.toLowerCase() === "j" ? Math.min(currentIndex + 1, visibleThreads.length - 1) : Math.max(currentIndex - 1, 0);
        const nextThread = visibleThreads[nextIndex < 0 ? 0 : nextIndex];
        if (nextThread) {
          setSelectedThreadId(nextThread.id);
          void markThreadUnread(nextThread.id, false);
          void loadMessagesForSelectedThread(nextThread.id);
        }
      }
      if (!selected) return;
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        void archiveThread(selected.id);
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void toggleThreadStarred(selected.id);
      } else if (event.key === "#") {
        event.preventDefault();
        void moveThreadToTrash(selected.id);
      } else if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        void markThreadUnread(selected.id, !selected.unread);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSelectedThreadId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView, archiveThread, markThreadUnread, moveThreadToTrash, selectedThreadId, setSelectedThreadId, toggleThreadStarred, visibleThreads]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgb(44_218_255_/_0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgb(155_124_255_/_0.12),transparent_32%),#07090f]">
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <motion.section
        className="relative z-10 grid h-full min-h-0 grid-cols-[auto_minmax(340px,430px)_1fr] max-[1100px]:grid-cols-[80px_minmax(340px,430px)_1fr] max-[800px]:grid-cols-[80px_1fr]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sidebar />
        {activeView === "settings" ? (
          <div className="col-span-2 min-h-0 max-[800px]:col-span-1">
            <SettingsPage />
          </div>
        ) : (
          <>
            <InboxList />
            <div className="min-h-0 max-[800px]:hidden">
              <MailReader />
            </div>
          </>
        )}
      </motion.section>
      <CommandPalette />
    </main>
  );
}
