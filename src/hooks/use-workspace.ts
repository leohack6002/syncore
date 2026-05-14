import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectGoogleAccount } from "@/services/auth/native-auth";
import { connectAndPersistAccount, loadCachedWorkspace, syncAllAccounts } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";

export function useWorkspace() {
  const queryClient = useQueryClient();
  const searchQuery = useMailStore((state) => state.searchQuery);

  const workspace = useQuery({
    queryKey: ["workspace", searchQuery],
    queryFn: () => loadCachedWorkspace(searchQuery)
  });

  const connectAccount = useMutation({
    mutationFn: async () => {
      const account = await connectGoogleAccount();
      return connectAndPersistAccount(account);
    },
    onSuccess: async () => {
      await syncAllAccounts();
      await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    }
  });

  const sync = useMutation({
    mutationFn: syncAllAccounts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace"] })
  });

  return {
    workspace,
    connectAccount,
    sync
  };
}
