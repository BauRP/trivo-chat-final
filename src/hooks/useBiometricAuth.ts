import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem("trivo-biometric") === "true";
  });
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  useEffect(() => {
    if (isEnabled && Capacitor.isNativePlatform()) {
      setIsLocked(true);
      authenticate();
    }
  }, []);

  const checkAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      return;
    }
    try {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
      const result = await BiometricAuth.checkBiometry();
      setIsAvailable(result.isAvailable);
    } catch {
      setIsAvailable(false);
    }
  };

  const authenticate = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
      await BiometricAuth.authenticate({
        reason: "Unlock Trivo Chat",
        cancelTitle: "Cancel",
      });
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const toggle = useCallback(async () => {
    if (!isEnabled) {
      const success = await authenticate();
      if (success) {
        setIsEnabled(true);
        localStorage.setItem("trivo-biometric", "true");
      }
    } else {
      setIsEnabled(false);
      localStorage.setItem("trivo-biometric", "false");
      setIsLocked(false);
    }
  }, [isEnabled]);

  return { isAvailable, isEnabled, isLocked, toggle, authenticate };
}
