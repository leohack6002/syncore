import { invokeCommand } from "@/services/tauri";

/**
 * Sends an email-aware prompt to the native Anthropic command.
 */
export async function askAnthropic(prompt: string, emailBody: string) {
  return invokeCommand<string>("ask_anthropic", {
    input: {
      prompt,
      emailBody
    }
  });
}
