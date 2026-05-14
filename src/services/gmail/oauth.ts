import { openUrl } from "@tauri-apps/plugin-opener";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid"
];

export function buildGoogleOAuthUrl(state: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_REDIRECT_URI.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES.join(" "),
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function startGoogleOAuth() {
  const state = crypto.randomUUID();
  await openUrl(buildGoogleOAuthUrl(state));
  return state;
}

export async function exchangeOAuthCode(code: string) {
  void code;
  throw new Error("OAuth code exchange must be implemented through a secure Tauri command or PKCE flow before production use.");
}
