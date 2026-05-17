import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Bell, FileText, MoreHorizontal, Reply, Sparkles, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import { sanitizeEmailHtml } from "@/utils/sanitize-email";

export function MailReader() {
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const threads = useMailStore((state) => state.threads);
  const accounts = useMailStore((state) => state.accounts);
  const messages = useMailStore((state) => state.selectedMessages);
  const toggleThreadStarred = useMailStore((state) => state.toggleThreadStarred);
  const thread = useMemo(() => threads.find((item) => item.id === selectedThreadId), [selectedThreadId, threads]);
  const account = useMemo(() => accounts.find((item) => item.id === thread?.accountId), [accounts, thread?.accountId]);
  const renderedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        sanitizedBodyHtml: message.bodyHtml ? sanitizeEmailHtml(message.bodyHtml) : ""
      })),
    [messages]
  );

  if (!thread) {
    return (
      <section className="grid min-w-0 place-items-center bg-[#07090f]/72 p-8 text-center backdrop-blur-2xl">
        <div>
          <p className="text-lg font-semibold text-white">Nothing selected</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Connect Gmail or choose a message from the unified inbox.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col bg-[#07090f]/72 backdrop-blur-2xl">
      <header className="flex h-[81px] items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Reading</p>
          <h2 className="truncate text-lg font-semibold text-white">{thread.subject}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Archive message">
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={thread.starred ? "Unstar message" : "Star message"}
            onClick={() => void toggleThreadStarred(thread.id)}
          >
            <Star className={thread.starred ? "h-4 w-4 fill-amber-300 text-amber-300" : "h-4 w-4"} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notification settings">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete message">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More message actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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
                  To {account?.email} via Gmail - {thread.messageCount} message thread
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </div>

            {messages.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">This thread is cached without message bodies yet. Refresh sync to fetch full content.</p>
            ) : null}

            {renderedMessages.map((message) => (
              <div key={message.id} className="mt-8 border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
                <div className="mb-4 text-xs text-muted-foreground">
                  {message.from} - {formatRelativeTime(message.receivedAt)}
                </div>
                {message.sanitizedBodyHtml ? (
                  <EmailBodyFrame html={message.sanitizedBodyHtml} />
                ) : (
                  <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-200">{message.bodyText}</div>
                )}
                {message.attachments.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {attachment.filename}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </motion.article>
      </div>

      <footer className="border-t border-white/10 p-4">
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-left text-sm text-muted-foreground transition hover:bg-white/[0.07]"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Ask Syncora to summarize, find action items, or draft a reply
        </button>
      </footer>
    </section>
  );
}

function EmailBodyFrame({ html }: { html: string }) {
  const [height, setHeight] = useState(360);
  const srcDoc = useMemo(
    () => `<!doctype html>
<html>
  <head>
    <base target="_blank" />
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; background: #ffffff; color: #111827; font: 14px/1.55 Arial, Helvetica, sans-serif; }
      body { padding: 18px; overflow-wrap: anywhere; }
      img { max-width: 100%; height: auto; }
      table { max-width: 100%; }
      a { color: #0369a1; }
      pre { white-space: pre-wrap; }
    </style>
  </head>
  <body>${html}</body>
</html>`,
    [html]
  );

  return (
    <iframe
      title="Email body"
      className="w-full rounded-lg border border-white/10 bg-white"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={srcDoc}
      style={{ height }}
      onLoad={(event) => {
        const body = event.currentTarget.contentDocument?.body;
        const documentElement = event.currentTarget.contentDocument?.documentElement;
        const nextHeight = Math.max(body?.scrollHeight ?? 0, documentElement?.scrollHeight ?? 0, 220);
        setHeight(Math.min(nextHeight + 2, 1600));
      }}
    />
  );
}
