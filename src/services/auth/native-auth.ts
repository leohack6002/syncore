import { invokeCommand } from "@/services/tauri";
import type { EmailAccount } from "@/types/email";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid"
];

type OAuthStatus = "waiting" | "connected" | "failed";

type OAuthSession = {
  id: string;
  authUrl: string;
  redirectUri: string;
  status: OAuthStatus;
  account?: EmailAccount;
  error?: string;
};

let connectPromise: Promise<EmailAccount> | null = null;

export async function connectGoogleAccount() {
  if (connectPromise) return connectPromise;

  connectPromise = startGoogleAccountConnection().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

async function startGoogleAccountConnection() {
  const clientId = getGoogleClientId();

  const session = await invokeCommand<OAuthSession>("start_google_oauth", {
    input: {
      clientId,
      scopes: GMAIL_SCOPES
    }
  });

  return waitForOAuthSession(session.id);
}

function getGoogleClientId() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("Google OAuth is not configured. Add VITE_GOOGLE_CLIENT_ID to .env and restart Syncora.");
  }

  if (clientId.includes(" ") || clientId.includes("\"") || clientId.includes("'")) {
    throw new Error("Google OAuth client id is malformed. Use the raw desktop client id without quotes or spaces.");
  }

  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    throw new Error("Google OAuth client id must be a desktop OAuth client id ending in .apps.googleusercontent.com.");
  }

  return clientId;
}

export async function waitForOAuthSession(sessionId: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 180_000) {
    const session = await invokeCommand<OAuthSession>("oauth_session_status", { sessionId });
    if (session.status === "connected" && session.account) return session.account;
    if (session.status === "failed") throw new Error(session.error ?? "Google OAuth failed.");
    await new Promise((resolve) => window.setTimeout(resolve, 900));
  }

  throw new Error("Google OAuth timed out.");
}

export function logoutGoogleAccount(accountId: string) {
  return invokeCommand<void>("logout_google_account", { accountId });
}
