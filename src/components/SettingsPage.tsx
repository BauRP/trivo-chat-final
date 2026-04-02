import { ArrowLeft, Moon, Shield, Bell, Globe, Fingerprint, Sun, Radio, EyeOff, FileText, Trash2, Mail, ExternalLink, BellOff } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIdentity } from "@/contexts/IdentityContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { languageNames } from "@/i18n/translations";
import TransparencyPage from "./TransparencyPage";
import { Separator } from "./ui/separator";
import { nukeAllData } from "@/lib/storage";

interface SettingsPageProps {
  onBack: () => void;
}

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <button onClick={onChange} className="neon-switch" data-state={value ? "on" : "off"}>
    <div
      className="w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform"
      style={{
        transform: value ? "translateX(24px)" : "translateX(2px)",
        background: value ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
      }}
    />
  </button>
);

const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { noiseEnabled, stealthMode, toggleNoise, toggleStealth, deleteAccount } = useIdentity();
  const { isEnabled: biometricEnabled, toggle: toggleBiometric } = useBiometricAuth();

  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem("trivo-notifications") !== "false";
  });
  const [hideContent, setHideContent] = useState(() => {
    return localStorage.getItem("trivo-hide-content") === "true";
  });
  const [showTransparency, setShowTransparency] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (showTransparency) {
    return <TransparencyPage onBack={() => setShowTransparency(false)} />;
  }

  const handleToggleNotifications = async () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem("trivo-notifications", String(newValue));
    if (newValue && "Notification" in window) {
      await Notification.requestPermission();
    }
  };

  const handleToggleHideContent = () => {
    const newValue = !hideContent;
    setHideContent(newValue);
    localStorage.setItem("trivo-hide-content", String(newValue));
  };

  const handleDeleteAccount = async () => {
    try {
      await nukeAllData();
      deleteAccount();
      window.location.reload();
    } catch {
      deleteAccount();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-4 pb-2 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold gradient-text">{t("settings")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-0">
        {/* Top Group: Dark Mode + Language */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
          {theme === "dark" ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-400" />}
          <span className="flex-1 text-sm text-foreground">{t("darkTheme")}</span>
          <Toggle value={theme === "dark"} onChange={toggleTheme} />
        </div>

        <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm mt-1.5">
          <Globe size={18} className="text-purple-400" />
          <span className="flex-1 text-sm text-foreground">{t("language")}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-secondary text-foreground text-xs rounded-lg px-2.5 py-1.5 border-0 neon-border focus:outline-none"
          >
            {Object.entries(languageNames).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        <Separator className="my-3 bg-border/40" />

        {/* Notifications Section */}
        <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">{t("notificationsSection")}</p>

        <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
          <Bell size={18} className="text-yellow-400" />
          <span className="flex-1 text-sm text-foreground">{t("notifications")}</span>
          <Toggle value={notifications} onChange={handleToggleNotifications} />
        </div>

        <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm mt-1.5">
          <BellOff size={18} className="text-orange-400" />
          <div className="flex-1">
            <span className="text-sm text-foreground">{t("hideMessageContent")}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("hideMessageContentDesc")}</p>
          </div>
          <Toggle value={hideContent} onChange={handleToggleHideContent} />
        </div>

        <Separator className="my-3 bg-border/40" />

        {/* Security Section */}
        <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">{t("securitySection")}</p>

        <div className="space-y-1.5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
            <Fingerprint size={18} className="text-pink-400" />
            <span className="flex-1 text-sm text-foreground">{t("biometricLock")}</span>
            <Toggle value={biometricEnabled} onChange={toggleBiometric} />
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
            <Radio size={18} className="text-primary" />
            <div className="flex-1">
              <span className="text-sm text-foreground">{t("networkNoise")}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("networkNoiseDesc")}</p>
            </div>
            <Toggle value={noiseEnabled} onChange={toggleNoise} />
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
            <EyeOff size={18} className="text-purple-400" />
            <div className="flex-1">
              <span className="text-sm text-foreground">{t("invisibleMode")}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("invisibleModeDesc")}</p>
            </div>
            <Toggle value={stealthMode} onChange={toggleStealth} />
          </div>

          <button
            onClick={() => setShowTransparency(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm text-left"
          >
            <FileText size={18} className="text-primary" />
            <span className="flex-1 text-sm text-foreground">{t("technicalTransparency")}</span>
            <ArrowLeft size={14} className="text-muted-foreground rotate-180" />
          </button>
        </div>

        <Separator className="my-3 bg-border/40" />

        {/* Support & Privacy Section */}
        <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">{t("supportPrivacy")}</p>

        <div className="space-y-1.5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm">
            <Mail size={18} className="text-blue-400" />
            <span className="flex-1 text-sm text-foreground">{t("supportEmail")}</span>
            <a href="mailto:trivo.support@proton.me" className="text-xs text-primary">
              trivo.support@proton.me
            </a>
          </div>

          <a
            href="https://baurp.github.io/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl glass-panel-sm"
          >
            <Shield size={18} className="text-primary" />
            <span className="flex-1 text-sm text-foreground">{t("privacyPolicy")}</span>
            <ExternalLink size={14} className="text-muted-foreground" />
          </a>
        </div>

        {/* Delete Account - with clear separation */}
        <div className="mt-8 pb-6">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">{t("deleteAccount")}</span>
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="glass-panel neon-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-destructive text-center">{t("deleteAccount")}</h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t("deleteAccountConfirm")}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl glass-panel-sm text-sm text-foreground font-medium hover:bg-secondary/50 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors"
              >
                {t("deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
