import { QrCode, ScanLine, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIdentity } from "@/contexts/IdentityContext";
import { Capacitor } from "@capacitor/core";
import gun from "@/lib/gun-setup";
import { saveChatMeta } from "@/lib/p2p";

const AddFriend = () => {
  const [mode, setMode] = useState<"qr" | "scan">("qr");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [friendAdded, setFriendAdded] = useState(false);
  const [manualId, setManualId] = useState("");
  const { t } = useLanguage();
  const { fingerprint, identity } = useIdentity();

  const qrValue = fingerprint;

  const startNativeScan = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== "granted") {
        await BarcodeScanner.requestPermissions();
      }
      const result = await BarcodeScanner.scan();
      if (result.barcodes.length > 0) {
        handleScannedId(result.barcodes[0].rawValue);
      }
    } catch (err) {
      console.warn("Scanner error:", err);
    }
  }, []);

  const handleScannedId = (scannedId: string) => {
    setScanResult(scannedId);
    addFriendById(scannedId);
  };

  const addFriendById = async (friendId: string) => {
    if (!friendId || !fingerprint || friendId === fingerprint) return;

    // Bi-directional Gun handshake
    gun.get("trivo-friends").get(fingerprint).get(friendId).put({
      addedAt: Date.now(),
      status: "confirmed",
    });
    gun.get("trivo-friends").get(friendId).get(fingerprint).put({
      addedAt: Date.now(),
      status: "confirmed",
    });

    gun.get("trivo-friend-requests").get(friendId).get(fingerprint).put({
      from: fingerprint,
      signingKey: identity?.signing.publicKey,
      exchangeKey: identity?.exchange.publicKey,
      timestamp: Date.now(),
    });

    // Create chat entry in local storage
    await saveChatMeta({
      friendId,
      friendName: friendId.substring(0, 8),
      lastMessage: "",
      lastMessageTime: Date.now(),
      unread: 0,
      started: false,
    });

    setFriendAdded(true);
    setTimeout(() => setFriendAdded(false), 3000);
  };

  useEffect(() => {
    if (mode === "scan" && Capacitor.isNativePlatform()) {
      startNativeScan();
    }
  }, [mode, startNativeScan]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold gradient-text">{t("addFriend")}</h1>
      </div>

      <div className="flex gap-2 px-5 mb-6 shrink-0">
        {([
          { id: "qr" as const, labelKey: "myQrCode" as const, icon: QrCode },
          { id: "scan" as const, labelKey: "scanQr" as const, icon: ScanLine },
        ]).map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              mode === id
                ? "bg-primary text-primary-foreground neon-glow"
                : "glass-panel-sm text-muted-foreground hover:text-foreground hover:neon-border"
            }`}
          >
            <Icon size={18} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {friendAdded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mx-5 mb-4 p-3 rounded-xl bg-primary/20 neon-border flex items-center gap-2"
        >
          <UserPlus size={16} className="text-primary" />
          <span className="text-sm text-primary font-medium">{t("friendAdded")}</span>
        </motion.div>
      )}

      <div className="flex-1 flex items-center justify-center px-5 overflow-y-auto">
        {mode === "qr" ? (
          <motion.div
            key="qr"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-8 flex flex-col items-center gap-5 neon-border"
          >
            <div className="p-4 bg-card rounded-2xl neon-border">
              <QRCodeSVG
                value={qrValue || "loading..."}
                size={200}
                bgColor="transparent"
                fgColor="hsl(172, 100%, 42%)"
                level="H"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("yourUniqueId")}</p>
              <p className="text-xs font-mono text-foreground/60 break-all max-w-[250px]">
                {qrValue || "..."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[260px]">
              {t("shareQr")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="scan"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-8 flex flex-col items-center gap-5 neon-border w-full max-w-[320px]"
          >
            <div className="w-56 h-56 rounded-2xl neon-border flex items-center justify-center relative overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-primary/60"
                style={{ boxShadow: "0 0 12px hsl(var(--neon-glow) / 0.6)" }}
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <ScanLine size={48} className="text-primary/30" />
            </div>

            {Capacitor.isNativePlatform() ? (
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                {t("pointCamera")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  {t("cameraRequired")}
                </p>
                <div className="w-full space-y-2">
                  <input
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder={t("enterFriendId")}
                    className="glass-input w-full text-sm"
                  />
                  <button
                    onClick={() => {
                      if (manualId.trim()) {
                        addFriendById(manualId.trim());
                        setManualId("");
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium neon-glow"
                  >
                    <UserPlus size={16} className="inline mr-2" />
                    {t("addFriend")}
                  </button>
                </div>
              </>
            )}

            {scanResult && (
              <div className="text-center mt-2">
                <p className="text-xs text-primary font-mono break-all">{scanResult}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AddFriend;
