// Decentralized Base58 Identity System
import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";
import bs58 from "bs58";

/**
 * Generate a Base58-encoded User ID from the Ed25519 public key hash.
 */
export function publicKeyToBase58Id(publicKey: string): string {
  const bytes = Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0));
  const hash = nacl.hash(bytes).slice(0, 20); // 20 bytes = short but unique
  return bs58.encode(hash);
}

/**
 * Validate that a string looks like a valid Trivo Base58 ID.
 */
export function isValidBase58Id(id: string): boolean {
  if (!id || id.length < 20 || id.length > 40) return false;
  try {
    const decoded = bs58.decode(id);
    return decoded.length === 20;
  } catch {
    return false;
  }
}

/**
 * Get or create the local user's Base58 ID.
 */
export async function getLocalBase58Id(): Promise<string> {
  const { getOrCreateIdentity } = await import("./crypto");
  const identity = await getOrCreateIdentity();
  return publicKeyToBase58Id(identity.signing.publicKey);
}
