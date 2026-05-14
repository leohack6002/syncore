import { AnimatePresence, motion } from "framer-motion";
import { Archive, Inbox, LogIn, Search, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMailStore } from "@/store/mail-store";
import { useCommandPalette } from "@/store/ui-store";

const commands = [
  { label: "Search unified inbox", icon: Search, hint: "Local FTS" },
  { label: "Connect Gmail account", icon: LogIn, hint: "OAuth" },
  { label: "Open Inbox", icon: Inbox, hint: "View" },
  { label: "Archive selected thread", icon: Archive, hint: "Action" },
  { label: "Notification settings", icon: Settings, hint: "System" },
  { label: "Smart reply draft", icon: Sparkles, hint: "Future" }
];

export function CommandPalette() {
  const { isOpen, setOpen } = useCommandPalette();
  const searchQuery = useMailStore((state) => state.searchQuery);
  const setSearchQuery = useMailStore((state) => state.setSearchQuery);
  const { connectAccount, sync } = useWorkspace();

  function runCommand(label: string) {
    if (label === "Connect Gmail account") connectAccount.mutate();
    if (label === "Search unified inbox") sync.mutate();
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/45 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => setOpen(false)}
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
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search emails, accounts, labels, or commands..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
              />
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Esc
              </Button>
            </div>
            <div className="p-2">
              {commands.map((command) => (
                <button
                  key={command.label}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-white transition hover:bg-white/[0.07]"
                  onClick={() => runCommand(command.label)}
                >
                  <command.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{command.label}</span>
                  <span className="text-xs text-muted-foreground">{command.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
