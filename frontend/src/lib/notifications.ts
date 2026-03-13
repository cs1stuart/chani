const APP_NAME = "WorkChat";

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showNotification(
  title: string,
  options?: { body?: string; tag?: string; onClick?: () => void }
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const n = new Notification(title, {
    body: options?.body ?? "",
    icon: "/favicon.ico",
    tag: options?.tag ?? "workchat",
    requireInteraction: options?.tag === "call",
  });
  n.onclick = () => {
    window.focus();
    n.close();
    options?.onClick?.();
  };
}

export function setDocumentTitle(title: string): void {
  if (typeof document !== "undefined") document.title = title;
}
