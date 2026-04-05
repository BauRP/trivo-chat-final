import { Copy, UserPlus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIdentity } from "@/contexts/IdentityContext";
import { toast } from "sonner";
import gun from "@/lib/gun-setup";
import { saveChatMeta } from "@/lib/p2p";
import { isValidBase58Id, publicKeyToBase58Id } from "@/lib/identity";
import { isUserBlocked, unblockUser } from "@/lib/report";

const AddFriend = () => {
  const [peerId, setPeerId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [pendingUnblockId, setPendingUnblockId] = useState("");
  const { t } = useLanguage();
  const { fingerprint, identity } = useIdentity();

  const myBase58Id = identity ? publicKeyToBase58Id(identity.signing.publicKey) : "";

  const handleCopy = async () => {
    if (!myBase58Id) return;
    try {
      await navigator.clipboard.writeText(myBase58Id);
      setCopied(true);
      toast.success(t("idCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const handleAddFriend = async () => {
    const trimmed = peerId.trim();
    if (!trimmed) return;

    if (!isValidBase58Id(trimmed)) {
      toast.error(t("invalidIdFormat"));
      return;
    }

    if (trimmed === myBase58Id) {
      toast.error(t("cannotAddSelf"));
      return;
    }

    // Check if user is blocked
    const blocked = await isUserBlocked(trimmed);
    if (blocked) {
      setPendingUnblockId(trimmed);
      setShowUnblockModal(true);
      return;
    }

    await addFriend(trimmed);
  };

  const addFriend = async (friendId: string) => {
    if (!fingerprint || !identity) return;

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
      signingKey: identity.signing.publicKey,
      exchangeKey: identity.exchange.publicKey,
      timestamp: Date.now(),
    });

    await saveChatMeta({
      friendId,
      friendName: friendId.substring(0, 8),
      lastMessage: "",
      lastMessageTime: Date.now(),
      unread: 0,
      started: false,
    });

    toast.success(t("friendAdded"));
    setPeerId("");
  };

  const handleUnblockAndAdd = async () => {
    await unblockUser(pendingUnblockId);
    await addFriend(pendingUnblockId);
    setShowUnblockModal(false);
    setPendingUnblockId("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold gradient-text">{t("addFriend")}</h1>
      </div>

      <div className="flex-1 flex flex-col px-5 gap-6 overflow-y-auto scrollbar-hide">
        {/* Your Unique ID */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 neon-border rounded-xl"
        >
          <p className="text-xs text-muted-foreground mb-2">{t("yourUniqueId")}</p>
          <div className="flex items-center gap-3">
            <p className="flex-1 font-mono text-sm text-foreground break-all select-all">
              {myBase58Id || "..."}
            </p>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2.5 rounded-xl glass-panel-sm hover:neon-border transition-all"
              aria-label="Copy ID"
            >
              {copied ? (
                <Check size={18} className="text-primary" />
              ) : (
                <Copy size={18} className="text-muted-foreground" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{t("shareIdDesc")}</p>
        </motion.div>

        {/* Add Peer ID */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-5 neon-border rounded-xl"
        >
          <p className="text-xs text-muted-foreground mb-3">{t("addPeerById")}</p>
          <div className="flex items-center gap-2">
            <input
              value={peerId}
              onChange={(e) => setPeerId(e.target.value)}
              placeholder={t("enterFriendId")}
              className="glass-input flex-1 py-2.5 text-sm font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            />
            <button
              onClick={handleAddFriend}
              disabled={!peerId.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium neon-glow disabled:opacity-30 transition-all flex items-center gap-2"
            >
              <UserPlus size={16} />
              {t("add")}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Unblock Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel neon-border rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <h2 className="text-lg font-bold text-foreground text-center">{t("unblockRestore")}</h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t("unblockRestoreDesc")}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowUnblockModal(false); setPendingUnblockId(""); }}
                className="flex-1 py-2.5 rounded-xl glass-panel-sm text-sm text-foreground font-medium hover:bg-secondary/50 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleUnblockAndAdd}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                {t("unblock")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AddFriend;
