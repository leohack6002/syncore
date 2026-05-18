import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, Archive, Filter, Inbox, RefreshCcw, Search, Send, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useWorkspace } from "@/hooks/use-workspace";
import { filterThreadsByFolder } from "@/lib/mail-folders";
import { cn, formatFullDateTime, formatRelativeTime } from "@/lib/utils";
import { loadCachedWorkspace, loadMessagesForSelectedThread } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import type { EmailThread } from "@/types/email";

type ThreadFilter = "all" | "unread" | "read" | "starred";

/**
 * Renders the searchable, virtualized thread list for the active folder and account.
 */
export function InboxList() {
  const threads = useMailStore((state) => state.threads);
  const accounts = useMailStore((state) => state.accounts);
  const query = useMailStore((state) => state.searchQuery);
  const setQuery = useMailStore((state) => state.setSearchQuery);
  const toggleThreadStarred = useMailStore((state) => state.toggleThreadStarred);
  const markThreadUnread = useMailStore((state) => state.markThreadUnread);
  const canLoadMoreThreads = useMailStore((state) => state.canLoadMoreThreads);
  const loadingMoreThreads = useMailStore((state) => state.loadingMoreThreads);
  const emptyTrash = useMailStore((state) => state.emptyTrash);
  const deleteThreadPermanently = useMailStore((state) => state.deleteThreadPermanently);
  const syncStatus = useMailStore((state) => state.syncStatus);
  const error = useMailStore((state) => state.error);
  const activeFolder = useUIStore((state) => state.activeFolder);
  const activeAccountFilter = useUIStore((state) => state.activeAccountFilter);
  const setActiveAccountFilter = useUIStore((state) => state.setActiveAccountFilter);
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useUIStore((state) => state.setSelectedThreadId);
  const parentRef = useRef<HTMLDivElement>(null);
  const didRunInitialSearchLoad = useRef(false);
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const { sync, connectAccount, loadMore } = useWorkspace();
  const filteredByAccount = useMemo(
    () => (activeAccountFilter ? threads.filter((thread) => thread.accountId === activeAccountFilter) : threads),
    [activeAccountFilter, threads]
  );
  const visibleThreads = useMemo(
    () => applyThreadFilter(filterThreadsByFolder(filteredByAccount, activeFolder), threadFilter),
    [activeFolder, filteredByAccount, threadFilter]
  );
  const accountsById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const activeAccount = useMemo(() => accounts.find((account) => account.id === activeAccountFilter), [accounts, activeAccountFilter]);
  const activeFolderLabel = activeFolder[0].toUpperCase() + activeFolder.slice(1);
  const getItemKey = useCallback((index: number) => visibleThreads[index]?.id ?? index, [visibleThreads]);

  useEffect(() => {
    if (!didRunInitialSearchLoad.current) {
      didRunInitialSearchLoad.current = true;
      if (!debouncedQuery.trim()) return;
    }

    void loadCachedWorkspace(debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    const selectedStillVisible = visibleThreads.some((thread) => thread.id === selectedThreadId);
    const nextThreadId = selectedStillVisible ? selectedThreadId : visibleThreads[0]?.id ?? null;

    if (nextThreadId !== selectedThreadId) {
      setSelectedThreadId(nextThreadId);
      void loadMessagesForSelectedThread(nextThreadId);
    }
  }, [activeFolder, selectedThreadId, setSelectedThreadId, visibleThreads]);

  const virtualizer = useVirtualizer({
    count: visibleThreads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 148,
    getItemKey,
    overscan: 8
  });

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col border-r border-white/10 bg-[#0b0f18]/82 backdrop-blur-xl">
      <header className="shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" />
              {activeFolderLabel}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white">{activeFolderLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Refresh inbox" onClick={() => sync.mutate()} disabled={sync.isPending || syncStatus === "syncing"}>
              <RefreshCcw className={cn("h-4 w-4", syncStatus === "syncing" && "animate-spin")} />
            </Button>
            {activeFolder === "trash" ? (
              <Button variant="ghost" size="sm" aria-label="Empty trash" onClick={() => void emptyTrash()}>
                Empty trash
              </Button>
            ) : null}
            <div className="relative">
              <Button variant="ghost" size="sm" aria-label="Filter inbox" onClick={() => setFilterOpen((open) => !open)}>
                <Filter className="h-4 w-4" />
                {threadFilter !== "all" ? filterLabel(threadFilter) : null}
              </Button>
              {filterOpen ? (
                <div className="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#101622] p-1 shadow-2xl">
                  {(["all", "unread", "read", "starred"] as ThreadFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={cn("block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-white/[0.07] hover:text-white", threadFilter === filter && "bg-white/[0.08] text-white")}
                      onClick={() => {
                        setThreadFilter(filter);
                        setFilterOpen(false);
                      }}
                    >
                      {filterLabel(filter)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {activeAccount ? (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
            onClick={() => setActiveAccountFilter(null)}
          >
            <X className="h-3 w-3" />
            All accounts
            <span className="text-primary/80">{activeAccount.email}</span>
          </button>
        ) : null}

        <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-muted-foreground focus-within:border-primary/60">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sender, subject, labels..."
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground"
          />
        </label>
      </header>

      <div ref={parentRef} className="min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden">
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
        ) : visibleThreads.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <EmptyFolderIcon folder={activeFolder} />
              <p className="mt-3 font-medium text-white">{accounts.length ? emptyTitle(activeFolder, query) : "No Gmail accounts connected"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accounts.length ? emptyDescription(activeFolder) : "Add an account to sync your local inbox cache."}
              </p>
              {accounts.length === 0 ? (
                <Button className="mt-4" size="sm" onClick={() => connectAccount.mutate()} disabled={connectAccount.isPending}>
                  {connectAccount.isPending ? "Connecting..." : "Add Gmail account"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() + (canLoadMoreThreads ? 56 : 0) }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const thread = visibleThreads[virtualRow.index];
              return (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  accountColor={accountsById.get(thread.accountId)?.color}
                  activeFolder={activeFolder}
                  query={query}
                  selected={selectedThreadId === thread.id}
                  size={virtualRow.size}
                  start={virtualRow.start}
                  onSelect={setSelectedThreadId}
                  onRead={markThreadUnread}
                  onStar={toggleThreadStarred}
                  onDelete={deleteThreadPermanently}
                />
              );
            })}
            {canLoadMoreThreads ? (
              <div className="absolute left-0 w-full p-3" style={{ transform: `translateY(${virtualizer.getTotalSize()}px)` }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 bg-white/[0.04] text-muted-foreground"
                  onClick={() => loadMore.mutate()}
                  disabled={loadingMoreThreads || loadMore.isPending}
                >
                  {loadingMoreThreads || loadMore.isPending ? "Loading more..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function displayLabels(labels: string[]) {
  const labelMap: Record<string, { text: string; className: string } | null> = {
    INBOX: null,
    UNREAD: null,
    STARRED: null,
    CATEGORY_PROMOTIONS: { text: "Promotions", className: "border-amber-300/20 bg-amber-300/10 text-amber-200" },
    CATEGORY_UPDATES: { text: "Updates", className: "border-sky-300/20 bg-sky-300/10 text-sky-200" },
    CATEGORY_SOCIAL: { text: "Social", className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" },
    SENT: { text: "Sent", className: "border-white/10 bg-white/[0.04] text-muted-foreground" },
    TRASH: { text: "Trash", className: "border-red-300/20 bg-red-300/10 text-red-200" }
  };

  return labels
    .map((label) => labelMap[label] ?? { text: label.replace(/^CATEGORY_/, "").replace(/_/g, " ").toLowerCase(), className: "border-white/10 bg-white/[0.04] text-muted-foreground" })
    .filter((label): label is { text: string; className: string } => Boolean(label))
    .slice(0, 2);
}

const ThreadRow = memo(function ThreadRow({
  thread,
  accountColor,
  activeFolder,
  query,
  selected,
  size,
  start,
  onSelect,
  onRead,
  onStar,
  onDelete
}: {
  thread: EmailThread;
  accountColor?: string;
  activeFolder: string;
  query: string;
  selected: boolean;
  size: number;
  start: number;
  onSelect: (threadId: string | null) => void;
  onRead: (threadId: string, unread: boolean) => Promise<void>;
  onStar: (threadId: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
}) {
  const labels = useMemo(() => displayLabels(thread.labels), [thread.labels]);

  const selectThread = useCallback(() => {
    onSelect(thread.id);
    void onRead(thread.id, false);
    void loadMessagesForSelectedThread(thread.id);
  }, [onRead, onSelect, thread.id]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "absolute left-0 top-0 w-full cursor-pointer overflow-hidden border-b border-white/[0.07] p-4 text-left transition hover:bg-white/[0.04]",
        selected && "bg-white/[0.07]"
      )}
      style={{ height: size, transform: `translateY(${start}px)` }}
      onClick={selectThread}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectThread();
      }}
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full opacity-100" style={{ backgroundColor: accountColor }} />
        <span className={cn("min-w-0 flex-1 truncate text-sm", thread.unread ? "font-semibold text-white" : "text-muted-foreground")}>
          {thread.senderName}
        </span>
        <span className="text-xs text-muted-foreground" title={formatFullDateTime(thread.receivedAt)}>
          {formatRelativeTime(thread.receivedAt)}
        </span>
      </div>
      <div className="mt-2 flex items-start gap-2">
        {thread.unread && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{thread.subject}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{highlightText(thread.preview, query)}</p>
        </div>
      </div>
      <div className="mt-3 flex h-6 items-center gap-2 overflow-hidden">
        <button
          type="button"
          className={cn("shrink-0 rounded p-0.5 text-muted-foreground transition hover:text-amber-300", thread.starred && "text-amber-300")}
          aria-label={thread.starred ? "Unstar message" : "Star message"}
          onClick={(event) => {
            event.stopPropagation();
            void onStar(thread.id);
          }}
        >
          <Star className={cn("h-3.5 w-3.5", thread.starred && "fill-current")} />
        </button>
        {labels.map((label) => (
          <span key={label.text} className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", label.className)}>
            {label.text}
          </span>
        ))}
        {thread.messageCount > 1 && activeFolder !== "trash" ? <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{thread.messageCount} messages</span> : null}
        {activeFolder === "trash" ? (
          <button
            type="button"
            className="ml-auto shrink-0 rounded border border-red-300/20 px-2 py-0.5 text-[11px] text-red-200 hover:bg-red-300/10"
            onClick={(event) => {
              event.stopPropagation();
              void onDelete(thread.id);
            }}
          >
            Delete permanently
          </button>
        ) : null}
      </div>
    </div>
  );
});

function emptyTitle(folder: string, query: string) {
  if (query.trim()) return `No results for "${query.trim()}"`;
  if (folder === "starred") return "No starred messages";
  if (folder === "sent") return "No sent messages";
  if (folder === "trash") return "Trash is empty";
  if (folder === "archive") return "No archived messages";
  if (folder === "inbox") return "No inbox email";
  return "No matching email";
}

function emptyDescription(folder: string) {
  if (folder === "starred") return "Star messages to keep them within easy reach.";
  if (folder === "sent") return "Sent Gmail threads will appear here after sync.";
  if (folder === "trash") return "Deleted messages will appear here before permanent removal.";
  if (folder === "archive") return "Archived threads appear here when they no longer carry the Inbox label.";
  return "Try another folder, search term, or refresh your inbox.";
}

function EmptyFolderIcon({ folder }: { folder: string }) {
  const Icon = folder === "starred" ? Star : folder === "sent" ? Send : folder === "archive" ? Archive : folder === "trash" ? Trash2 : Inbox;
  return <Icon className="mx-auto h-8 w-8 text-muted-foreground" />;
}

function applyThreadFilter(threads: EmailThread[], filter: ThreadFilter) {
  if (filter === "unread") return threads.filter((thread) => thread.unread);
  if (filter === "read") return threads.filter((thread) => !thread.unread);
  if (filter === "starred") return threads.filter((thread) => thread.starred);
  return threads;
}

function filterLabel(filter: ThreadFilter) {
  if (filter === "unread") return "Unread only";
  if (filter === "read") return "Read only";
  if (filter === "starred") return "Starred only";
  return "All";
}

function highlightText(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-primary/20 text-primary">{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}
