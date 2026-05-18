import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Inbox, Layers3, LogIn, RefreshCcw, Search, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMailStore } from "@/store/mail-store";
import { useCommandPalette, useUIStore } from "@/store/ui-store";
import type { MailFolder } from "@/types/email";

type Command = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Search;
  run: () => void;
};

/**
 * Renders the keyboard-driven command palette for navigation and workspace actions.
 */
export function CommandPalette() {
  const { isOpen, setOpen } = useCommandPalette();
  const searchQuery = useMailStore((state) => state.searchQuery);
  const setSearchQuery = useMailStore((state) => state.setSearchQuery);
  const accounts = useMailStore((state) => state.accounts);
  const threads = useMailStore((state) => state.threads);
  const markThreadUnread = useMailStore((state) => state.markThreadUnread);
  const activeFolder = useUIStore((state) => state.activeFolder);
  const setActiveFolder = useUIStore((state) => state.setActiveFolder);
  const setActiveAccountFilter = useUIStore((state) => state.setActiveAccountFilter);
  const { connectAccount, sync } = useWorkspace();
  const [commandQuery, setCommandQuery] = useState("");

  useEffect(() => {
    if (isOpen) setCommandQuery(searchQuery);
  }, [isOpen, searchQuery]);

  function close() {
    setOpen(false);
  }

  function openFolder(folder: MailFolder) {
    setActiveFolder(folder);
    close();
  }

  const commands: Command[] = [
    {
      id: "sync",
      label: "Sync Gmail now",
      icon: RefreshCcw,
      hint: sync.isPending ? "Syncing" : "Refresh",
      run: () => {
        sync.mutate();
        close();
      }
    },
    {
      id: "connect",
      label: "Connect Gmail account",
      icon: LogIn,
      hint: connectAccount.isPending ? "Opening" : "OAuth",
      run: () => {
        connectAccount.mutate();
        close();
      }
    },
    { id: "unified", label: "Open Unified", icon: Layers3, hint: activeFolder === "unified" ? "Current" : "View", run: () => openFolder("unified") },
    { id: "inbox", label: "Open Inbox", icon: Inbox, hint: activeFolder === "inbox" ? "Current" : "View", run: () => openFolder("inbox") },
    { id: "starred", label: "Open Starred", icon: Star, hint: activeFolder === "starred" ? "Current" : "View", run: () => openFolder("starred") },
    { id: "sent", label: "Open Sent", icon: Send, hint: activeFolder === "sent" ? "Current" : "View", run: () => openFolder("sent") },
    { id: "archive", label: "Open Archive", icon: Archive, hint: activeFolder === "archive" ? "Current" : "View", run: () => openFolder("archive") },
    {
      id: "mark-all-read",
      label: "Mark all as read",
      icon: Inbox,
      hint: "Shift U",
      run: () => {
        threads.filter((thread) => thread.unread).forEach((thread) => void markThreadUnread(thread.id, false));
        close();
      }
    },
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      label: `Go to account: ${account.email}`,
      icon: Inbox,
      hint: "Account",
      run: () => {
        setActiveAccountFilter(account.id);
        close();
      }
    })),
    {
      id: "search",
      label: commandQuery.trim() ? `Search for "${commandQuery.trim()}"` : "Search local mail",
      icon: Search,
      hint: "Local",
      run: () => {
        setSearchQuery(commandQuery);
        close();
      }
    }
  ];

  const visibleCommands = commands.filter((command) => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return true;
    return command.label.toLowerCase().includes(query) || command.hint.toLowerCase().includes(query);
  });

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/45 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={close}
        >
          <motion.div
            className="glass-panel w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-2xl"
            initial={{ scale: 0.96, y: -12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: -8 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") close();
                }}
                placeholder="Search emails, accounts, labels, or commands..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
              />
              <Button variant="ghost" size="sm" onClick={close}>
                Esc
              </Button>
            </div>
            <div className="max-h-[420px] overflow-auto p-2">
              {visibleCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-white transition hover:bg-white/[0.07]"
                  onClick={command.run}
                >
                  <command.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{command.label}</span>
                  <span className="text-xs text-muted-foreground">{command.hint}</span>
                </button>
              ))}
              {visibleCommands.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching commands.</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
