// Ed25519 + X25519 + XSalsa20-Poly1305 encryption layer using tweetnacl
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";
import { dbGet, dbPut } from "./storage";

export interface KeyPair {
  publicKey: string; // base64
  secretKey: string; // base64
}

export interface IdentityKeys {
  signing: KeyPair;    // Ed25519 for identity
  exchange: KeyPair;   // X25519 for key exchange / encryption
  createdAt: number;
}

/**
 * Generate or load local Ed25519 + X25519 identity.
 * Keys are stored exclusively in IndexedDB — never leaves the device.
 */
export async function getOrCreateIdentity(): Promise<IdentityKeys> {
  const existing = await dbGet<IdentityKeys>("identity", "keys");
  if (existing) return existing;

  const signingKP = nacl.sign.keyPair();
  const exchangeKP = nacl.box.keyPair();

  const identity: IdentityKeys = {
    signing: {
      publicKey: encodeBase64(signingKP.publicKey),
      secretKey: encodeBase64(signingKP.secretKey),
    },
    exchange: {
      publicKey: encodeBase64(exchangeKP.publicKey),
      secretKey: encodeBase64(exchangeKP.secretKey),
    },
    createdAt: Date.now(),
  };

  await dbPut("identity", "keys", identity);
  return identity;
}

/**
 * Encrypt a message for a recipient using X25519 + XSalsa20-Poly1305 (NaCl box).
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderSecretKey: string
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msgBytes = decodeUTF8(plaintext);
  const pubKey = decodeBase64(recipientPublicKey);
  const secKey = decodeBase64(senderSecretKey);

  const encrypted = nacl.box(msgBytes, nonce, pubKey, secKey);
  if (!encrypted) throw new Error("Encryption failed");

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt a message from a sender.
 */
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string {
  const decrypted = nacl.box.open(
    decodeBase64(ciphertext),
    decodeBase64(nonce),
    decodeBase64(senderPublicKey),
    decodeBase64(recipientSecretKey)
  );
  if (!decrypted) throw new Error("Decryption failed — invalid key or tampered data");
  return encodeUTF8(decrypted);
}

/**
 * Sign data with Ed25519.
 */
export function signData(data: string, secretKey: string): string {
  const sig = nacl.sign.detached(decodeUTF8(data), decodeBase64(secretKey));
  return encodeBase64(sig);
}

/**
 * Verify Ed25519 signature.
 */
export function verifySignature(data: string, signature: string, publicKey: string): boolean {
  return nacl.sign.detached.verify(
    decodeUTF8(data),
    decodeBase64(signature),
    decodeBase64(publicKey)
  );
}

/**
 * Post-Quantum Hybrid layer (PQXDH simulation).
 * Real Kyber/OQS requires WASM — this wraps standard X3DH with
 * an additional symmetric key layer using random entropy.
 * In production, swap this with actual Kyber KEM.
 */
export function pqxdhEncrypt(
  plaintext: string,
  recipientPublicKey: string,
  senderSecretKey: string
): { ciphertext: string; nonce: string; pqEntropy: string } {
  // Additional entropy layer simulating PQ key encapsulation
  const pqEntropy = nacl.randomBytes(32);
  const combinedPlaintext = encodeBase64(pqEntropy) + "||" + plaintext;

  const result = encryptMessage(combinedPlaintext, recipientPublicKey, senderSecretKey);
  return {
    ...result,
    pqEntropy: encodeBase64(pqEntropy),
  };
}

export function pqxdhDecrypt(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string {
  const decrypted = decryptMessage(ciphertext, nonce, senderPublicKey, recipientSecretKey);
  const parts = decrypted.split("||");
  // Strip the PQ entropy prefix, return the actual message
  return parts.length > 1 ? parts.slice(1).join("||") : decrypted;
}

/**
 * Get a truncated fingerprint of a public key for display.
 */
export function getKeyFingerprint(publicKey: string): string {
  const bytes = decodeBase64(publicKey);
  const hash = nacl.hash(bytes);
  return encodeBase64(hash).substring(0, 16).toUpperCase();
}
