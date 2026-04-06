// Real-time presence system via GunDB
import gun from "./gun-setup";

type PresenceStatus = "online" | "away" | "offline";
type PresenceCallback = (userId: string, status: PresenceStatus) => void;

const listeners = new Set<PresenceCallback>();
const presenceCache = new Map<string, PresenceStatus>();

const HEARTBEAT_INTERVAL = 15000; // 15s
const OFFLINE_THRESHOLD = 45000; // 45s without heartbeat = offline

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startPresence(userId: string) {
  publishHeartbeat(userId);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => publishHeartbeat(userId), HEARTBEAT_INTERVAL);

  // Handle visibility changes
  const handleVisibility = () => {
    if (document.hidden) {
      publishStatus(userId, "away");
    } else {
      publishStatus(userId, "online");
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  // Handle beforeunload
  const handleUnload = () => publishStatus(userId, "offline");
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("beforeunload", handleUnload);
    publishStatus(userId, "offline");
  };
}

function publishHeartbeat(userId: string) {
  try {
    gun.get("trivo-presence").get(userId).put({
      status: document.hidden ? "away" : "online",
      lastSeen: Date.now(),
    });
  } catch {}
}

function publishStatus(userId: string, status: PresenceStatus) {
  try {
    gun.get("trivo-presence").get(userId).put({
      status,
      lastSeen: Date.now(),
    });
  } catch {}
}

export function subscribeToPresence(userId: string): () => void {
  try {
    gun.get("trivo-presence").get(userId).on((data: any) => {
      if (!data || !data.lastSeen) return;
      const elapsed = Date.now() - data.lastSeen;
      let status: PresenceStatus;
      if (elapsed > OFFLINE_THRESHOLD) {
        status = "offline";
      } else {
        status = data.status || "offline";
      }
      const prev = presenceCache.get(userId);
      if (prev !== status) {
        presenceCache.set(userId, status);
        listeners.forEach((cb) => cb(userId, status));
      }
    });
  } catch {}

  return () => {
    try {
      gun.get("trivo-presence").get(userId).off();
    } catch {}
  };
}

export function getPresenceStatus(userId: string): PresenceStatus {
  return presenceCache.get(userId) || "offline";
}

export function onPresenceChange(cb: PresenceCallback): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
