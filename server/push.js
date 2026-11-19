import webpush from "web-push";
import { db, id, getSetting } from "./database.js";
export async function pushKeys() {
  const keys =
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
      ? {
          publicKey: process.env.VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        }
      : JSON.parse((await getSetting("vapid")) || "null");
  if (!keys)
    throw new Error("Chưa cấu hình Web Push. Hãy chạy npm run db:setup.");
  return keys;
}
export function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return (
      u.protocol === "https:" &&
      (!u.port || u.port === "443") &&
      [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
        "wns.windows.com",
      ].some((h) => u.hostname === h || u.hostname.endsWith("." + h)) &&
      typeof s.keys?.p256dh === "string" &&
      typeof s.keys?.auth === "string" &&
      s.keys.p256dh.length < 256 &&
      s.keys.auth.length < 128
    );
  } catch {
    return false;
  }
}
export async function notifyUsers(userIds, title, body, url = "/") {
  if (!userIds.length) return { devices: 0, sent: 0 };
  await db.query(
    "INSERT INTO notifications(id,user_id,title,body,url) SELECT gen_random_uuid()::text,unnest($1::text[]),$2,$3,$4",
    [userIds, title, body, url],
  );
  const { rows: subs } = await db.query(
    "SELECT * FROM subscriptions WHERE user_id=ANY($1::text[])",
    [userIds],
  );
  if (!subs.length) return { devices: 0, sent: 0 };
  const keys = await pushKeys();
  const deliveries = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.payload),
          JSON.stringify({ title, body, url }),
          {
            TTL: 86400,
            timeout: 8000,
            vapidDetails: {
              subject: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
              ...keys,
            },
          },
        );
        return true;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410)
          await db
            .prepare("DELETE FROM subscriptions WHERE endpoint=?")
            .run(sub.endpoint);
        return false;
      }
    }),
  );
  return {
    devices: deliveries.length,
    sent: deliveries.filter((r) => r.status === "fulfilled" && r.value).length,
  };
}
