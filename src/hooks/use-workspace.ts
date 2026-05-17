import { useMutation } from "@tanstack/react-query";
import { connectGoogleAccount } from "@/services/auth/native-auth";
import { connectAndPersistAccount, syncAllAccounts } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";

export function useWorkspace() {
  const setError = useMailStore((state) => state.setError);

  const connectAccount = useMutation({
    mutationFn: async () => {
      const account = await connectGoogleAccount();
      return connectAndPersistAccount(account);
    },
    onSuccess: async () => {
      await syncAllAccounts(true);
    },
    onError: (error) => {
      setError({ message: cleanWorkspaceError(error, "Google account connection failed.") });
    }
  });

  const sync = useMutation({
    mutationFn: () => syncAllAccounts(true),
    onError: (error) => {
      setError({ message: cleanWorkspaceError(error, "Sync failed.") });
    }
  });

  return {
    connectAccount,
    sync
  };
}

function cleanWorkspaceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/confidential client|desktop OAuth client id|VITE_GOOGLE_CLIENT_ID|OAuth is not configured/i.test(message)) return message;
  if (/oauth|token|permission|unauthorized|forbidden|invalid_grant/i.test(message)) {
    return "Gmail authorization failed. Please reconnect the account and try again.";
  }
  if (/timeout|timed out|network|offline|temporarily unavailable|10035|would block/i.test(message)) {
    return "Gmail is temporarily unreachable. Check your connection and try again.";
  }
  return fallback;
}
