// Gun.js decentralized data sync layer
import Gun from "gun";
import "gun/sea";

let gun: any;

try {
  gun = Gun({
    peers: [
      "https://gun-manhattan.herokuapp.com/gun",
      "https://gun-us.herokuapp.com/gun",
    ],
    localStorage: true,
    radisk: true,
  });
} catch (e) {
  console.warn("[Gun] Failed to initialize:", e);
  // Fallback: create a local-only Gun instance
  gun = Gun({ localStorage: true, radisk: true });
}

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
  } catch (e) {
    console.warn("[Gun] publishPublicKeys error:", e);
  }
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
  } catch (e) {
    console.warn("[Gun] sendGunMessage error:", e);
  }
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
  } catch (e) {
    console.warn("[Gun] subscribeToChannel error:", e);
  }
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
  } catch (e) {
    console.warn("[Gun] sendNoisePacket error:", e);
  }
}