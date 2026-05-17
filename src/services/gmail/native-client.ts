import { invokeCommand } from "@/services/tauri";

export type GmailHeader = {
  name: string;
  value: string;
};

export type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
};

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export type GmailThread = {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
  snippet?: string;
};

export type GmailLabel = {
  id: string;
  name: string;
  type?: string;
};

type GmailListThreadsResponse = {
  threads?: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
};

const GMAIL_REQUEST_DELAY_MS = 150;
const GMAIL_MAX_RETRIES = 2;

let gmailQueue = Promise.resolve();
let lastGmailRequestAt = 0;

export async function gmailGet<T>(accountId: string, path: string) {
  return enqueueGmailRequest(() => invokeGmailGet<T>(accountId, path));
}

export function listGmailThreadIds(accountId: string, maxResults = 20) {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: "in:anywhere newer_than:30d"
  });

  return gmailGet<GmailListThreadsResponse>(accountId, `/threads?${params.toString()}`);
}

function getGmailThread(accountId: string, threadId: string, format: "metadata" | "full") {
  const params = new URLSearchParams({ format });

  if (format === "metadata") {
    ["From", "To", "Cc", "Subject", "Date"].forEach((header) => {
      params.append("metadataHeaders", header);
    });
  }

  return gmailGet<GmailThread>(accountId, `/threads/${threadId}?${params.toString()}`);
}

export function getGmailThreadMetadata(accountId: string, threadId: string) {
  return getGmailThread(accountId, threadId, "metadata");
}

export function getGmailThreadFull(accountId: string, threadId: string) {
  return getGmailThread(accountId, threadId, "full");
}

export async function listGmailLabels(accountId: string) {
  const response = await gmailGet<{ labels?: GmailLabel[] }>(accountId, "/labels");
  return response.labels ?? [];
}

function enqueueGmailRequest<T>(request: () => Promise<T>) {
  const run = gmailQueue.then(() => runPacedRequest(request));
  gmailQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function runPacedRequest<T>(request: () => Promise<T>) {
  const elapsed = Date.now() - lastGmailRequestAt;
  if (elapsed < GMAIL_REQUEST_DELAY_MS) {
    await delay(GMAIL_REQUEST_DELAY_MS - elapsed);
  }

  try {
    return await retryTransientRequest(request);
  } finally {
    lastGmailRequestAt = Date.now();
  }
}

async function retryTransientRequest<T>(request: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GMAIL_MAX_RETRIES; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === GMAIL_MAX_RETRIES) break;
      await delay(300 * (attempt + 1));
    }
  }

  throw normalizeGmailError(lastError);
}

function invokeGmailGet<T>(accountId: string, path: string) {
  return withTimeout(invokeCommand<T>("gmail_api_request", {
    input: {
      accountId,
      path,
      method: "GET"
    }
  }), 35_000);
}

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /10035|would block|temporarily unavailable|timed out|timeout|network request/i.test(message);
}

function normalizeGmailError(error: unknown) {
  if (isTransientNetworkError(error)) {
    return new Error("Gmail network request was temporarily unavailable. Please retry sync in a moment.");
  }

  return error instanceof Error ? error : new Error(String(error));
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Gmail request timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}
