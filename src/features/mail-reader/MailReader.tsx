import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Download, FileText, Inbox, Loader2, MoreHorizontal, Printer, Reply, Sparkles, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFullDateTime, formatRelativeTime } from "@/lib/utils";
import { askAnthropic } from "@/services/ai/anthropic";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";
import { sanitizeEmailHtml } from "@/utils/sanitize-email";

const ACTION_NOTICE_TIMEOUT_MS = 2_200;
const MIN_IFRAME_HEIGHT_PX = 220;
const DEFAULT_IFRAME_HEIGHT_PX = 360;
const MAX_IFRAME_HEIGHT_PX = 1_600;
const IFRAME_HEIGHT_PADDING_PX = 2;
const BYTES_PER_KILOBYTE = 1024;

/**
 * Renders the selected email conversation, message actions, attachments, and AI prompt bar.
 */
export function MailReader() {
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const selectedThreadId = useUIStore((state) => state.selectedThreadId);
  const threads = useMailStore((state) => state.threads);
  const accounts = useMailStore((state) => state.accounts);
  const messages = useMailStore((state) => state.selectedMessages);
  const messagesLoading = useMailStore((state) => state.selectedMessagesLoading);
  const toggleThreadStarred = useMailStore((state) => state.toggleThreadStarred);
  const archiveThread = useMailStore((state) => state.archiveThread);
  const moveThreadToTrash = useMailStore((state) => state.moveThreadToTrash);
  const moveThreadToInbox = useMailStore((state) => state.moveThreadToInbox);
  const markThreadUnread = useMailStore((state) => state.markThreadUnread);
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
  const emailBodyText = useMemo(
    () =>
      messages
        .map((message) => message.bodyText)
        .filter(Boolean)
        .join("\n\n")
        .trim(),
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

  const activeThread = thread;

  function showNotice(message: string) {
    setActionNotice(message);
    window.setTimeout(() => setActionNotice(null), ACTION_NOTICE_TIMEOUT_MS);
  }

  async function submitAiPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    try {
      const response = await askAnthropic(trimmedPrompt, emailBodyText || activeThread.preview);
      setAiResponse(response);
      setAiPrompt("");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Syncora could not reach Claude.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-[#07090f]/72 backdrop-blur-2xl transition-opacity duration-150">
      <header className="relative flex h-[81px] items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Reading</p>
          <h2 className="truncate text-lg font-semibold text-white">{thread.subject}</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasLabel(thread.labels, "INBOX") ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Archive message"
              onClick={() => {
                void archiveThread(thread.id);
                showNotice("Message archived");
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move to inbox"
              onClick={() => {
                void moveThreadToInbox(thread.id);
                showNotice("Moved to inbox");
              }}
            >
              <Inbox className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={thread.starred ? "Unstar message" : "Star message"}
            onClick={() => void toggleThreadStarred(thread.id)}
          >
            <Star className={thread.starred ? "h-4 w-4 fill-amber-300 text-amber-300" : "h-4 w-4"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete message"
            onClick={() => {
              void moveThreadToTrash(thread.id);
              showNotice("Message moved to trash");
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="relative">
          <Button variant="ghost" size="icon" aria-label="More message actions" onClick={() => setMessageMenuOpen((open) => !open)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
            {messageMenuOpen ? (
              <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#101622] p-1 shadow-2xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-white/[0.07] hover:text-white"
                  onClick={() => {
                    void markThreadUnread(thread.id, !thread.unread);
                    setMessageMenuOpen(false);
                  }}
                >
                  {thread.unread ? "Mark as read" : "Mark as unread"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-white/[0.07] hover:text-white"
                  onClick={() => {
                    window.print();
                    setMessageMenuOpen(false);
                  }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {actionNotice ? (
          <div className="absolute right-6 top-[calc(100%+8px)] z-20 rounded-lg border border-white/10 bg-[#101622] px-3 py-2 text-xs text-slate-200 shadow-2xl">
            {actionNotice}
          </div>
        ) : null}
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
                {messages[0] ? (
                  <details className="mt-3 text-xs text-muted-foreground">
                    <summary className="cursor-pointer text-slate-300">Recipients</summary>
                    <div className="mt-2 space-y-1">
                      <p>To: {messages[0].to.join(", ") || account?.email}</p>
                      {messages[0].cc?.length ? <p>Cc: {messages[0].cc.join(", ")}</p> : null}
                    </div>
                  </details>
                ) : null}
              </div>
              <Button variant="secondary" size="sm" onClick={() => showNotice("Reply is coming soon")}>
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </div>

            {messagesLoading ? <MessageSkeleton /> : null}

            {!messagesLoading && messages.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">This thread is cached without message bodies yet. Refresh sync to fetch full content.</p>
            ) : null}

            {renderedMessages.map((message) => (
              <div key={message.id} className="mt-8 border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
                <div className="mb-4 text-xs text-muted-foreground">
                  {message.from} - <span title={formatFullDateTime(message.receivedAt)}>{formatRelativeTime(message.receivedAt)}</span>
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
                        <span>{attachment.filename}</span>
                        <span className="text-[11px]">{formatAttachmentSize(attachment.size)}</span>
                        <Download className="h-3.5 w-3.5" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </motion.article>
      </div>

      <footer className="shrink-0 border-t border-white/10 p-4">
        {aiResponse || aiError ? (
          <div className="mb-3 max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200">
            {aiError ? <p className="text-red-200">{aiError}</p> : <div className="whitespace-pre-wrap">{aiResponse}</div>}
          </div>
        ) : null}
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ["Summarize", "Summarize this email thread."],
            ["Action items", "Find the action items in this email thread."],
            ["Draft reply", "Draft a concise, helpful reply to this email thread."]
          ].map(([label, prompt]) => (
            <Button key={label} type="button" variant="secondary" size="sm" onClick={() => void submitAiPrompt(prompt)} disabled={aiLoading}>
              {label}
            </Button>
          ))}
        </div>
        <form
          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-muted-foreground focus-within:border-primary/60"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAiPrompt(aiPrompt);
          }}
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
          <input
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Ask Syncora to summarize, find action items, or draft a reply"
            className="h-12 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground"
            disabled={aiLoading}
          />
        </form>
      </footer>
    </section>
  );
}

function hasLabel(labels: string[], label: string) {
  return labels.some((item) => item.toLowerCase() === label.toLowerCase());
}

function formatAttachmentSize(size: number) {
  if (size < BYTES_PER_KILOBYTE) return `${size} B`;
  if (size < BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE) return `${Math.round(size / BYTES_PER_KILOBYTE)} KB`;
  return `${(size / BYTES_PER_KILOBYTE / BYTES_PER_KILOBYTE).toFixed(1)} MB`;
}

function MessageSkeleton() {
  return (
    <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
      <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-9/12 animate-pulse rounded bg-white/10" />
    </div>
  );
}

function EmailBodyFrame({ html }: { html: string }) {
  const [height, setHeight] = useState(DEFAULT_IFRAME_HEIGHT_PX);
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
        const nextHeight = Math.max(body?.scrollHeight ?? 0, documentElement?.scrollHeight ?? 0, MIN_IFRAME_HEIGHT_PX);
        setHeight(Math.min(nextHeight + IFRAME_HEIGHT_PADDING_PX, MAX_IFRAME_HEIGHT_PX));
      }}
    />
  );
}
