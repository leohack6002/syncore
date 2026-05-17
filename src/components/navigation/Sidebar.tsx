import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import {
  Archive,
  Bell,
  ChevronLeft,
  Inbox,
  Layers3,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Star
} from "lucide-react";
import { SyncoraLogo } from "@/components/brand/SyncoraLogo";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFolderCounts } from "@/lib/mail-folders";
import { cn } from "@/lib/utils";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import type { MailFolder } from "@/types/email";

const navItems = [
  { id: "unified", label: "Unified", icon: Layers3 },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "sent", label: "Sent", icon: Send },
  { id: "archive", label: "Archive", icon: Archive }
] satisfies Array<{ id: MailFolder; label: string; icon: typeof Layers3 }>;

const utilityActions = [
  { label: "Notifications", icon: Bell },
  { label: "AI assistant", icon: Sparkles },
  { label: "Settings", icon: Settings }
] satisfies Array<{ label: string; icon: typeof Bell }>;

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const activeFolder = useUIStore((state) => state.activeFolder);
  const setActiveFolder = useUIStore((state) => state.setActiveFolder);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const openCommand = useUIStore((state) => state.toggleCommandPalette);
  const accounts = useMailStore((state) => state.accounts);
  const threads = useMailStore((state) => state.threads);
  const syncStatus = useMailStore((state) => state.syncStatus);
  const { connectAccount } = useWorkspace();
  const counts = useMemo(() => getFolderCounts(threads), [threads]);

  return (
    <motion.aside
      className="flex h-full flex-col border-r border-white/10 bg-black/20 p-3 backdrop-blur-2xl"
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between">
        <SyncoraLogo showWordmark={!collapsed} />
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <Button
        variant="secondary"
        className={cn("mt-6 justify-start bg-white/[0.06] text-muted-foreground", collapsed && "justify-center px-0")}
        onClick={openCommand}
      >
        <Search className="h-4 w-4" />
        <AnimatePresence>{!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Search or command</motion.span>}</AnimatePresence>
        {!collapsed && <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl K</kbd>}
      </Button>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white",
              activeFolder === item.id && "bg-white/[0.08] text-white",
              collapsed && "justify-center px-0"
            )}
            onClick={() => setActiveFolder(item.id)}
            aria-current={activeFolder === item.id ? "page" : undefined}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed ? <span className="ml-auto text-xs text-muted-foreground">{counts[item.id]}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {!collapsed && <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accounts</p>}
        <div className="space-y-1">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-white/[0.06]", collapsed && "justify-center px-0")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account.color }} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate">
                  <span className="block truncate text-white">{account.displayName}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{account.email}</span>
                </span>
              )}
            </button>
          ))}
          {accounts.length === 0 && !collapsed ? (
            <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">Connect Gmail to start building your local unified inbox.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <Button
          variant="outline"
          className={cn("w-full justify-start border-white/10 bg-white/[0.04]", collapsed && "justify-center px-0")}
          onClick={() => connectAccount.mutate()}
          disabled={connectAccount.isPending}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && (connectAccount.isPending ? "Connecting..." : "Add Gmail account")}
        </Button>
        {!collapsed && syncStatus === "syncing" ? <p className="px-2 text-xs text-primary">Syncing Gmail...</p> : null}
        <div className={cn("grid gap-2", collapsed ? "grid-cols-1" : "grid-cols-3")}>
          {utilityActions.map((action) => (
            <Button key={action.label} variant="ghost" size="icon" aria-label={action.label}>
              <action.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
