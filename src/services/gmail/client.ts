import type { GmailProfile, GmailThreadSummary } from "@/services/gmail/types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailRequest<T>(path: string, accessToken: string) {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Gmail API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getGmailProfile(accessToken: string) {
  return gmailRequest<GmailProfile>("/profile", accessToken);
}

export async function listGmailThreads(accessToken: string, pageToken?: string) {
  const params = new URLSearchParams({
    maxResults: "50",
    q: "in:anywhere"
  });

  if (pageToken) params.set("pageToken", pageToken);

  return gmailRequest<{ threads?: GmailThreadSummary[]; nextPageToken?: string }>(`/threads?${params.toString()}`, accessToken);
}
