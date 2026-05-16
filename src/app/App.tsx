import { useEffect } from "react";
import { AppShell } from "@/layouts/AppShell";
import { initializeDatabase } from "@/database/client";
import { loadCachedWorkspace, syncAllAccounts } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";
import { useCommandPalette } from "@/store/ui-store";

export function App() {
  const { toggle } = useCommandPalette();

  useEffect(() => {
    void initializeDatabase()
      .then(() => loadCachedWorkspace())
      .then(() => syncAllAccounts())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Syncora could not initialize the local workspace.";
        useMailStore.getState().setError({ message });
        useMailStore.getState().setSyncStatus("error");
      });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandKey = event.metaKey || event.ctrlKey;
      if (isCommandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return <AppShell />;
}
