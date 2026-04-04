import { Shield, Key, Fingerprint, Lock, Wifi, Activity, Zap, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useIdentity } from "@/contexts/IdentityContext";
import { useLanguage } from "@/contexts/LanguageContext";

const SecurityDashboard = () => {
  const { identity, fingerprint, stealthMode, toggleStealth } = useIdentity();
  const { t } = useLanguage();

  const statusItems = [
    {
      icon: Lock,
      label: t("encryptionStatus"),
      value: t("e2eeActive"),
      color: "text-primary",
      active: true,
    },
    {
      icon: Fingerprint,
      label: t("biometricLock"),
      value: t("active"),
      color: "text-pink-400",
      active: true,
    },
    {
      icon: stealthMode ? EyeOff : Eye,
      label: t("stealthMode"),
      value: stealthMode ? t("active") : t("inactive"),
      color: stealthMode ? "text-primary" : "text-muted-foreground",
      active: stealthMode,
      onToggle: toggleStealth,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold gradient-text">{t("security")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Shield Icon */}
        <div className="flex justify-center pb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center neon-glow"
          >
            <Shield size={40} className="text-primary" />
          </motion.div>
        </div>

        {/* Status Cards */}
        <div className="px-5 space-y-2">
          {statusItems.map(({ icon: Icon, label, value, color, active, onToggle }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl glass-panel-sm neon-border"
            >
              <Icon
                size={20}
                className={color}
                style={active ? { filter: "drop-shadow(0 0 4px currentColor)" } : {}}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className={`text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>{value}</p>
              </div>
              {onToggle && (
                <button
                  onClick={onToggle}
                  className="neon-switch"
                  data-state={active ? "on" : "off"}
                >
                  <div
                    className="w-5 h-5 rounded-full absolute top-0.5 transition-transform"
                    style={{
                      transform: active ? "translateX(24px)" : "translateX(2px)",
                      background: active ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                    }}
                  />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Key Info */}
        <div className="px-5 mt-6 space-y-2 pb-6">
          <p className="text-xs text-muted-foreground font-medium px-1">{t("localKeyInfo")}</p>

          <div className="glass-panel neon-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Fingerprint size={18} className="text-pink-400" style={{ filter: "drop-shadow(0 0 4px #f472b6)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("keyFingerprint")}</p>
                <p className="text-sm font-mono text-foreground truncate">{fingerprint || "..."}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Key size={18} className="text-yellow-400" style={{ filter: "drop-shadow(0 0 4px #facc15)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("signingKey")}</p>
                <p className="text-sm font-mono text-foreground truncate">
                  {identity?.signing.publicKey.substring(0, 24)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Zap size={18} className="text-blue-400" style={{ filter: "drop-shadow(0 0 4px #60a5fa)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("exchangeKey")}</p>
                <p className="text-sm font-mono text-foreground truncate">
                  {identity?.exchange.publicKey.substring(0, 24)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Activity size={18} className="text-purple-400" style={{ filter: "drop-shadow(0 0 4px #a78bfa)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("pqxdhStatus")}</p>
                <p className="text-sm text-primary font-medium">{t("hybridActive")}</p>
              </div>
            </div>
          </div>

          {/* Encryption Info */}
          <div className="glass-panel-sm rounded-xl p-4 mt-2">
            <div className="flex items-start gap-3">
              <Wifi size={18} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("p2pNetwork")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("gunDbConnected")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
