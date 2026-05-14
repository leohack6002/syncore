export type GmailOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};

export type GmailProfile = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
};

export type GmailThreadSummary = {
  id: string;
  historyId: string;
  snippet: string;
  labelIds?: string[];
};
