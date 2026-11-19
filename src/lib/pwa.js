import { api } from "./api";
export async function registerWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    if (process.env.NODE_ENV === "development") {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active?.scriptURL === location.origin + "/sw.js")
        await registration.unregister();
      return;
    }
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
  } catch (error) {
    console.warn("Service worker:", error);
  }
}
export async function enablePush() {
  if (!window.isSecureContext) throw new Error("Thông báo cần kết nối HTTPS.");
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    throw new Error(
      "Trên iPhone/iPad, thêm Mầm Nhỏ vào Màn hình chính rồi mở ứng dụng để bật thông báo (iOS 16.4 trở lên).",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      permission === "denied"
        ? "Thông báo đang bị chặn. Hãy mở cài đặt trình duyệt để cho phép."
        : "Bạn chưa cho phép nhận thông báo.",
    );
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active)
    throw new Error(
      "Ứng dụng chưa sẵn sàng nhận thông báo. Hãy tải lại trang qua kết nối HTTPS rồi thử lại.",
    );
  const { publicKey } = await api("/push/key");
  const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")),
    key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const sub =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    }));
  await api("/push/subscribe", { method: "POST", body: sub.toJSON() });
  return true;
}
export async function disablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api("/push/subscribe", {
      method: "DELETE",
      body: { endpoint: sub.endpoint },
    });
    await sub.unsubscribe();
  }
}
