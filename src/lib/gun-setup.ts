// Gun.js decentralized data sync layer
import Gun from "gun";
import "gun/sea";

// Robust multi-node relay list with auto-failover
const RELAY_PEERS = [
  "https://gun-manhattan.herokuapp.com/gun",
  "https://peer.wallie.io/gun",
  "https://gundb-relay-mlccl.ondigitalocean.app/gun",
  "https://gun-ams1.livex.space/gun",
  "https://gun-sjc1.livex.space/gun",
];

let gun: any;

try {
  gun = Gun({
    peers: RELAY_PEERS,
    localStorage: true,
    radisk: true,
  });
} catch (e) {
  // Fallback: local-only Gun instance
  gun = Gun({ localStorage: true, radisk: true });
}

// Auto-failover: periodically check peer health and reconnect
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function startPeerHealthCheck() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(() => {
    try {
      const mesh = gun?.back?.("opt.peers") || gun?._.opt?.peers;
      if (!mesh || Object.keys(mesh).length === 0) {
        // No connected peers — attempt reconnection
        RELAY_PEERS.forEach((peer) => {
          try {
            gun.opt({ peers: [peer] });
          } catch {}
        });
      }
    } catch {}
  }, 30000); // Check every 30s
}

startPeerHealthCheck();

export default gun;

/**
 * Publish user's public keys to the Gun network so contacts can discover them.
 */
export function publishPublicKeys(
  userId: string,
  signingPubKey: string,
  exchangePubKey: string
) {
  try {
    gun.get("trivo-users").get(userId).put({
      signingKey: signingPubKey,
      exchangeKey: exchangePubKey,
      updatedAt: Date.now(),
    });
  } catch {}
}

/**
 * Lookup a contact's public keys by their ID.
 */
export function lookupPublicKeys(
  userId: string
): Promise<{ signingKey: string; exchangeKey: string } | null> {
  return new Promise((resolve) => {
    try {
      gun.get("trivo-users").get(userId).once((data: any) => {
        if (data && data.signingKey && data.exchangeKey) {
          resolve({ signingKey: data.signingKey, exchangeKey: data.exchangeKey });
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Send an encrypted message via GunDB.
 */
export function sendGunMessage(
  channelId: string,
  messagePayload: Record<string, unknown>
) {
  try {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    gun.get("trivo-channels").get(channelId).get(msgId).put({
      ...messagePayload,
      timestamp: Date.now(),
    });
  } catch {}
}

/**
 * Subscribe to messages on a channel.
 */
export function subscribeToChannel(
  channelId: string,
  callback: (data: any, key: string) => void
) {
  try {
    gun.get("trivo-channels").get(channelId).map().on(callback);
  } catch {}
}

/**
 * Send a dummy noise packet for traffic analysis resistance.
 */
export function sendNoisePacket() {
  try {
    const noiseChannelId = `noise-${Math.random().toString(36).slice(2, 10)}`;
    const dummyPayload = {
      type: "noise",
      data: Array.from(crypto.getRandomValues(new Uint8Array(64)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      timestamp: Date.now(),
    };
    gun.get("trivo-noise").get(noiseChannelId).put(dummyPayload);
  } catch {}
}
