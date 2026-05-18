import { useEffect, useState } from "react";
import { AppShell } from "@/layouts/AppShell";
import { SyncoraLogo } from "@/components/brand/SyncoraLogo";
import { initializeDatabase } from "@/database/client";
import { loadCachedWorkspace, syncAllAccounts } from "@/services/sync/sync-engine";
import { useMailStore } from "@/store/mail-store";
import { useCommandPalette } from "@/store/ui-store";

let startupPromise: Promise<void | (() => void)> | null = null;
const STARTUP_SYNC_DELAY_MS = 1_200;
const BACKGROUND_SYNC_INTERVAL_MS = 10 * 60_000;

/**
 * Bootstraps the local database, cached workspace, background sync, and app shell.
 */
export function App() {
  const { toggle } = useCommandPalette();
  const [startupState, setStartupState] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    if (!startupPromise) {
      startupPromise = initializeDatabase()
        .then(() => loadCachedWorkspace())
        .then(() => {
          window.setTimeout(() => {
            void syncAllAccounts();
          }, STARTUP_SYNC_DELAY_MS);
          const interval = window.setInterval(() => {
            void syncAllAccounts();
          }, BACKGROUND_SYNC_INTERVAL_MS);
          return () => window.clearInterval(interval);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Syncora could not initialize the local workspace.";
          useMailStore.getState().setError({ message });
          useMailStore.getState().setSyncStatus("error");
        });
    }

    let cancelled = false;
    let stopAutoSync: (() => void) | undefined;
    void startupPromise.then((cleanup) => {
      if (typeof cleanup === "function") stopAutoSync = cleanup;
    }).finally(() => {
      if (!cancelled) setStartupState("ready");
    });

    return () => {
      cancelled = true;
      stopAutoSync?.();
    };
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

  if (startupState === "loading") {
    return (
      <main className="grid h-screen w-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgb(44_218_255_/_0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgb(155_124_255_/_0.12),transparent_32%),#07090f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <SyncoraLogo />
          <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </main>
    );
  }

  return <AppShell />;
}
