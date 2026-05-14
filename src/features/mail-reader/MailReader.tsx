import { motion } from "framer-motion";
import { Archive, Bell, MoreHorizontal, Reply, ShieldCheck, Sparkles, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAccounts, mockMessage, mockThreads } from "@/data/mock-inbox";
import { formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

export function MailReader() {
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const thread = mockThreads.find((item) => item.id === selectedThreadId) ?? mockThreads[0];
  const account = mockAccounts.find((item) => item.id === thread.accountId);

  return (
    <section className="flex min-w-0 flex-col bg-[#07090f]/72 backdrop-blur-2xl">
      <header className="flex h-[81px] items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Reading</p>
          <h2 className="truncate text-lg font-semibold text-white">{thread.subject}</h2>
        </div>
        <div className="flex items-center gap-2">
          {[Archive, Star, Bell, Trash2, MoreHorizontal].map((Icon, index) => (
            <Button key={index} variant="ghost" size="icon" aria-label="Mail action">
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <motion.article
          key={thread.id}
          className="mx-auto max-w-4xl px-8 py-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-semibold text-black" style={{ backgroundColor: account?.color }}>
                {thread.senderName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-semibold text-white">{thread.senderName}</h3>
                  <span className="text-sm text-muted-foreground">{thread.senderEmail}</span>
                  <span className="text-sm text-muted-foreground">{formatRelativeTime(thread.receivedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  To {account?.email} via Gmail · {thread.messageCount} message thread
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </div>

            <div className="mt-8 space-y-5 text-[15px] leading-7 text-slate-200">
              <p>{mockMessage.bodyText}</p>
              <p>
                The foundation should keep Gmail-specific details isolated behind services, while the UI consumes normalized
                account, thread, and message models. That gives Syncora room to support Outlook, IMAP, and smarter local workflows later.
              </p>
              <p>
                I would prioritize the OAuth loop, secure token storage, SQLite migrations, and FTS search next. Once those are stable,
                notifications and keyboard-driven triage can layer in cleanly.
              </p>
            </div>

            <div className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
              {[
                ["FTS5 ready", "Local search schema prepared"],
                ["OAuth isolated", "Provider code stays replaceable"],
                ["Virtualized", "Inbox list scales smoothly"]
              ].map(([title, description]) => (
                <div key={title}>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {title}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.article>
      </div>

      <footer className="border-t border-white/10 p-4">
        <button className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-left text-sm text-muted-foreground transition hover:bg-white/[0.07]">
          <Sparkles className="h-4 w-4 text-primary" />
          Ask Syncora to summarize, find action items, or draft a reply
        </button>
      </footer>
    </section>
  );
}
