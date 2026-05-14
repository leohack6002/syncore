import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import type { EmailThread } from "@/types/email";

export async function notifyNewThread(thread: EmailThread) {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  if (permissionGranted) {
    sendNotification({
      title: thread.senderName,
      body: thread.subject
    });
  }
}
