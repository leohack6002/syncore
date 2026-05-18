import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/**
 * Returns true when the frontend is running inside the Tauri desktop shell.
 */
export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

/**
 * Invokes a typed Tauri command and returns a friendly error outside desktop runtime.
 */
export async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("Syncora desktop services are available inside the Tauri app.");
  }

  return tauriInvoke<T>(command, args);
}
