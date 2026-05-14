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

export async function gmailGet<T>(accountId: string, path: string) {
  return invokeCommand<T>("gmail_api_request", {
    input: {
      accountId,
      path,
      method: "GET"
    }
  });
}

export function listGmailThreadIds(accountId: string, maxResults = 30) {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: "in:anywhere newer_than:30d"
  });

  return gmailGet<GmailListThreadsResponse>(accountId, `/threads?${params.toString()}`);
}

export function getGmailThread(accountId: string, threadId: string) {
  const params = new URLSearchParams({
    format: "full"
  });

  return gmailGet<GmailThread>(accountId, `/threads/${threadId}?${params.toString()}`);
}

export async function listGmailLabels(accountId: string) {
  const response = await gmailGet<{ labels?: GmailLabel[] }>(accountId, "/labels");
  return response.labels ?? [];
}
