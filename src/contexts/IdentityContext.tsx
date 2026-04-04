import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getOrCreateIdentity, getKeyFingerprint, type IdentityKeys } from "@/lib/crypto";
import { publishPublicKeys } from "@/lib/gun-setup";
import { nukeAllData } from "@/lib/storage";

interface IdentityContextType {
  identity: IdentityKeys | null;
  fingerprint: string;
  isLoading: boolean;
  stealthMode: boolean;
  toggleStealth: () => void;
  deleteAccount: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider = ({ children }: { children: ReactNode }) => {
  const [identity, setIdentity] = useState<IdentityKeys | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    try { localStorage.setItem("trivo-stealth", String(stealthMode)); } catch {}
  }, [stealthMode]);

  const toggleStealth = useCallback(() => setStealthMode((p) => !p), []);

  const deleteAccount = useCallback(async () => {
    await nukeAllData();
    window.location.reload();
  }, []);

  const fingerprint = identity ? getKeyFingerprint(identity.signing.publicKey) : "";

  return (
    <IdentityContext.Provider
      value={{ identity, fingerprint, isLoading, stealthMode, toggleStealth, deleteAccount }}
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
