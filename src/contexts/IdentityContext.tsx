import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getOrCreateIdentity, getKeyFingerprint, type IdentityKeys } from "@/lib/crypto";
import { publishPublicKeys } from "@/lib/gun-setup";
import { startNetworkNoise, stopNetworkNoise } from "@/lib/stealth";
import { nukeAllData } from "@/lib/storage";

interface IdentityContextType {
  identity: IdentityKeys | null;
  fingerprint: string;
  isLoading: boolean;
  noiseEnabled: boolean;
  stealthMode: boolean;
  toggleNoise: () => void;
  toggleStealth: () => void;
  deleteAccount: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider = ({ children }: { children: ReactNode }) => {
  const [identity, setIdentity] = useState<IdentityKeys | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noiseEnabled, setNoiseEnabled] = useState(() => {
    try { return localStorage.getItem("trivo-noise") === "true"; } catch { return false; }
  });
  const [stealthMode, setStealthMode] = useState(() => {
    try { return localStorage.getItem("trivo-stealth") === "true"; } catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    getOrCreateIdentity()
      .then((keys) => {
        if (cancelled) return;
        setIdentity(keys);
        setIsLoading(false);
        try {
          const userId = getKeyFingerprint(keys.signing.publicKey);
          publishPublicKeys(userId, keys.signing.publicKey, keys.exchange.publicKey);
        } catch {}
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (noiseEnabled) {
      startNetworkNoise();
    } else {
      stopNetworkNoise();
    }
    try { localStorage.setItem("trivo-noise", String(noiseEnabled)); } catch {}
  }, [noiseEnabled]);

  useEffect(() => {
    try { localStorage.setItem("trivo-stealth", String(stealthMode)); } catch {}
  }, [stealthMode]);

  const toggleNoise = useCallback(() => setNoiseEnabled((p) => !p), []);
  const toggleStealth = useCallback(() => setStealthMode((p) => !p), []);

  const deleteAccount = useCallback(async () => {
    stopNetworkNoise();
    await nukeAllData();
    window.location.reload();
  }, []);

  const fingerprint = identity ? getKeyFingerprint(identity.signing.publicKey) : "";

  return (
    <IdentityContext.Provider
      value={{ identity, fingerprint, isLoading, noiseEnabled, stealthMode, toggleNoise, toggleStealth, deleteAccount }}
    >
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = () => {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
};
