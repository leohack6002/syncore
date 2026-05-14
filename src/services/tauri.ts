import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("Syncora desktop services are available inside the Tauri app.");
  }

  return tauriInvoke<T>(command, args);
}
