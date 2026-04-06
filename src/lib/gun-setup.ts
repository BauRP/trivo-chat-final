import Gun from "gun";
import "gun/sea";

const RELAY_PEERS = [
  "https://gun-manhattan.herokuapp.com/gun",
  "https://peer.wallie.io/gun",
  "https://gundb-relay-mlccl.ondigitalocean.app/gun",
  "https://gun-ams1.livex.space/gun",
  "https://gun-sjc1.livex.space/gun",
  "https://gun-us.herokuapp.com/gun",
  "https://gun-eu.herokuapp.com/gun",
  "https://gun-relay.herokuapp.com/gun",
  "https://gun2.livex.space/gun",
  "https://gun3.livex.space/gun",
  "https://gun-ams2.livex.space/gun",
  "https://gun-sjc2.livex.space/gun",
  "https://gun-fra1.livex.space/gun",
  "https://gun-lon1.livex.space/gun",
  "https://gun-sgp1.livex.space/gun",
  "https://gun-blr1.livex.space/gun",
  "https://gun-nyc1.livex.space/gun",
  "https://gun-sfo1.livex.space/gun",
  "https://gun-tor1.livex.space/gun",
  "https://gun-ams3.livex.space/gun",
  "https://gun-fra2.livex.space/gun",
  "https://gun-lon2.livex.space/gun",
  "https://gun-sgp2.livex.space/gun",
  "https://gun-blr2.livex.space/gun",
  "https://gun-nyc2.livex.space/gun",
  "https://gun-sfo2.livex.space/gun",
  "https://gun-tor2.livex.space/gun",
  "https://gun-ams4.livex.space/gun",
  "https://gun-fra3.livex.space/gun",
  "https://gun-lon3.livex.space/gun",
];

let gun: any;
let activeNodeIndex = 0;

function getActivePeers(): string[] {
  // Use 5 peers at a time, rotating through the list
  const peers: string[] = [];
  for (let i = 0; i < 5; i++) {
    peers.push(RELAY_PEERS[(activeNodeIndex + i) % RELAY_PEERS.length]);
  }
  return peers;
}

function rotateToNextNode() {
  activeNodeIndex = (activeNodeIndex + 5) % RELAY_PEERS.length;
  const newPeers = getActivePeers();
  try {
    newPeers.forEach((peer) => {
      try { gun.opt({ peers: [peer] }); } catch {}
    });
  } catch {}
}

try {
  gun = Gun({
    peers: getActivePeers(),
    localStorage: true,
    radisk: true,
  });
} catch {
  gun = Gun({ localStorage: true, radisk: true });
}

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function startPeerHealthCheck() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(() => {
    try {
      const mesh = gun?.back?.("opt.peers") || gun?._.opt?.peers;
      if (!mesh || Object.keys(mesh).length === 0) {
        rotateToNextNode();
      }
    } catch {}
  }, 30000);
}

startPeerHealthCheck();

export default gun;

export function publishPublicKeys(userId: string, signingPubKey: string, exchangePubKey: string) {
  try {
    gun.get("trivo-users").get(userId).put({
      signingKey: signingPubKey,
      exchangeKey: exchangePubKey,
      updatedAt: Date.now(),
    });
  } catch {}
}

export function lookupPublicKeys(userId: string): Promise<{ signingKey: string; exchangeKey: string } | null> {
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

export function sendGunMessage(channelId: string, messagePayload: Record<string, unknown>) {
  try {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    gun.get("trivo-channels").get(channelId).get(msgId).put({
      ...messagePayload,
      timestamp: Date.now(),
    });
  } catch {}
}

export function subscribeToChannel(channelId: string, callback: (data: any, key: string) => void) {
  try {
    gun.get("trivo-channels").get(channelId).map().on(callback);
  } catch {}
}

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
