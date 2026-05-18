import { useState } from "react";
import { ArrowLeft, Check, Monitor, RefreshCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { useMailStore } from "@/store/mail-store";
import { useUIStore } from "@/store/ui-store";

type SettingsTab = "accounts" | "appearance" | "notifications" | "sync";

const settingsTabs = [
  { id: "accounts", label: "Accounts", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Check },
  { id: "sync", label: "Sync", icon: RefreshCcw }
] satisfies Array<{ id: SettingsTab; label: string; icon: typeof UserRound }>;

/**
 * Renders workspace settings for accounts, appearance, notifications, and sync.
 */
export function SettingsPage() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("accounts");
  const closeSettings = useUIStore((state) => state.closeSettings);
  const accounts = useMailStore((state) => state.accounts);
  const threadsCount = useMailStore((state) => state.threads.length);
  const { connectAccount, disconnectAccount, sync } = useWorkspace();

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-[#07090f]/72 backdrop-blur-2xl">
      <header className="flex h-[81px] shrink-0 items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Workspace</p>
          <h1 className="truncate text-xl font-semibold text-white">Settings</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={closeSettings}>
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] max-[760px]:grid-cols-1">
        <nav className="border-r border-white/10 p-4 max-[760px]:flex max-[760px]:gap-2 max-[760px]:overflow-x-auto max-[760px]:border-b max-[760px]:border-r-0">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white max-[760px]:w-auto max-[760px]:shrink-0",
                settingsTab === tab.id && "bg-white/[0.08] text-white"
              )}
              onClick={() => setSettingsTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 overflow-y-auto p-6">
          {settingsTab === "accounts" ? (
            <div className="max-w-3xl space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                      <p className="truncate font-medium text-white">{account.displayName}</p>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{account.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last synced: {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : "Not synced yet"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => disconnectAccount.mutate(account.id)}>
                    Disconnect
                  </Button>
                </div>
              ))}
              <Button size="sm" onClick={() => connectAccount.mutate()} disabled={connectAccount.isPending}>
                {connectAccount.isPending ? "Connecting..." : "Add account"}
              </Button>
            </div>
          ) : null}

          {settingsTab === "appearance" ? <SettingsToggles labels={["Compact mode", "Show email previews", "Show sender avatars"]} /> : null}

          {settingsTab === "notifications" ? (
            <div className="max-w-2xl rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              Desktop notifications are disabled in this build.
            </div>
          ) : null}

          {settingsTab === "sync" ? (
            <div className="max-w-2xl space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">Background sync</p>
                <p className="mt-1">Syncora checks Gmail every 10 minutes and keeps manual refreshes larger.</p>
              </div>
              <p>Total cached emails: {threadsCount}</p>
              <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
                {sync.isPending ? "Syncing..." : "Sync now"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingsToggles({ labels }: { labels: string[] }) {
  return (
    <div className="max-w-2xl space-y-3">
      {labels.map((label) => (
        <label key={label} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
          <span>{label}</span>
          <input type="checkbox" className="h-4 w-4 accent-cyan-300" />
        </label>
      ))}
    </div>
  );
}
