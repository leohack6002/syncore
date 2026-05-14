import { useEffect } from "react";
import { AppShell } from "@/layouts/AppShell";
import { initializeDatabase } from "@/database/client";
import { loadCachedWorkspace, syncAllAccounts } from "@/services/sync/sync-engine";
import { useCommandPalette } from "@/store/ui-store";

export function App() {
  const { toggle } = useCommandPalette();

  useEffect(() => {
    void initializeDatabase()
      .then(() => loadCachedWorkspace())
      .then(() => syncAllAccounts())
      .catch((error) => console.error(error));
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
