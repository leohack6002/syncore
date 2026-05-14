import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { AlertCircle, Filter, Inbox, RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn, formatRelativeTime } from "@/lib/utils";
import { loadCachedWorkspace, loadMessagesForSelectedThread } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";

export function InboxList() {
  const threads = useMailStore((state) => state.threads);
  const accounts = useMailStore((state) => state.accounts);
  const query = useMailStore((state) => state.searchQuery);
  const setQuery = useMailStore((state) => state.setSearchQuery);
  const syncStatus = useMailStore((state) => state.syncStatus);
  const error = useMailStore((state) => state.error);
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useUIStore((state) => state.setSelectedThreadId);
  const parentRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query);
  const { sync, connectAccount } = useWorkspace();

  useEffect(() => {
    void loadCachedWorkspace(debouncedQuery);
  }, [debouncedQuery]);

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 118,
    overscan: 8
  });

  return (
    <section className="flex min-w-0 flex-col border-r border-white/10 bg-[#0b0f18]/82 backdrop-blur-xl">
      <header className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" />
              Inbox
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Unified</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Refresh inbox" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCcw className={cn("h-4 w-4", syncStatus === "syncing" && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Filter inbox">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-muted-foreground focus-within:border-primary/60">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sender, subject, labels..."
            className="h-full min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground"
          />
        </label>
      </header>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-3 font-medium text-white">Sync needs attention</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{error.message}</p>
              <Button className="mt-4" size="sm" onClick={() => sync.mutate()}>
                Retry sync
              </Button>
            </div>
          </div>
        ) : threads.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <p className="font-medium text-white">{accounts.length ? "No matching email" : "No Gmail accounts connected"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accounts.length ? "Try another search term or refresh your inbox." : "Add an account to sync your local inbox cache."}
              </p>
              {accounts.length === 0 ? (
                <Button className="mt-4" size="sm" onClick={() => connectAccount.mutate()}>
                  Add Gmail account
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const thread = threads[virtualRow.index];
              const account = accounts.find((item) => item.id === thread.accountId);
              const selected = selectedThreadId === thread.id;

              return (
                <motion.button
                  key={thread.id}
                  className={cn(
                    "absolute left-0 top-0 w-full border-b border-white/[0.07] p-4 text-left transition hover:bg-white/[0.04]",
                    selected && "bg-white/[0.07]"
                  )}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    void loadMessagesForSelectedThread(thread.id);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account?.color }} />
                    <span className={cn("min-w-0 flex-1 truncate text-sm", thread.unread ? "font-semibold text-white" : "text-muted-foreground")}>
                      {thread.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(thread.receivedAt)}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    {thread.unread && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{thread.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{thread.preview}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {thread.labels.map((label) => (
                      <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    ))}
                    {thread.messageCount > 1 && <span className="ml-auto text-[11px] text-muted-foreground">{thread.messageCount} messages</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
