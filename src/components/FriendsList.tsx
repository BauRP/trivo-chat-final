import { MessageCircle, MoreVertical, VolumeX, Trash2, Ban, Star, StarOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import SecurityBadges from "./SecurityBadges";
import DefaultAvatar from "./DefaultAvatar";
import MuteModal from "./MuteModal";
import { getAllChatMetas, type ChatMeta } from "@/lib/p2p";

interface Friend {
  id: string;
  name: string;
  avatar?: string | null;
  status: "online" | "away" | "offline";
  blocked: boolean;
  starred: boolean;
  security: { e2ee: boolean; invisible: boolean };
}

interface FriendsListProps {
  onOpenChat: (id: string, name: string, emoji: string) => void;
}

const statusColors = {
  online: "bg-primary",
  away: "bg-yellow-500",
  offline: "bg-muted-foreground/40",
};

const FriendsList = ({ onOpenChat }: FriendsListProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [muteTarget, setMuteTarget] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const loadFriends = async () => {
      const metas = await getAllChatMetas();
      const friendList: Friend[] = metas.map((m: ChatMeta) => ({
        id: m.friendId,
        name: m.friendName,
        avatar: m.friendAvatar || null,
        status: "offline" as const,
        blocked: false,
        starred: false,
        security: { e2ee: true, invisible: false },
      }));
      setFriends(friendList);
    };
    loadFriends();
    const interval = setInterval(loadFriends, 5000);
    return () => clearInterval(interval);
  }, []);

  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setMenuOpen(null);
  };

  const toggleBlock = (id: string) => {
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, blocked: !f.blocked } : f)));
    setMenuOpen(null);
  };

  const toggleStar = (id: string) => {
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)));
    setMenuOpen(null);
  };

  const statusLabelMap: Record<string, string> = {
    online: t("online"),
    away: t("away"),
    offline: t("offline"),
  };

  if (friends.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold gradient-text">{t("friends")}</h1>
          <span className="text-sm text-muted-foreground">0 {t("contacts")}</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-8">
          <p className="text-sm text-muted-foreground text-center">{t("emptyFriendsList")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold gradient-text">{t("friends")}</h1>
        <span className="text-sm text-muted-foreground">{friends.length} {t("contacts")}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-1.5">
        <AnimatePresence>
          {friends.map((friend, i) => (
            <motion.div
              key={friend.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl glass-panel-sm hover:neon-border transition-all relative cursor-pointer"
              style={{ zIndex: menuOpen === friend.id ? 30 : 1 }}
              onClick={() => onOpenChat(friend.id, friend.name, "")}
            >
              <div className="relative shrink-0">
                <DefaultAvatar src={friend.avatar} size={48} />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${statusColors[friend.status]}`}
                  style={friend.status === "online" ? { boxShadow: "0 0 6px hsl(var(--neon-glow) / 0.6)" } : {}}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{friend.name}</p>
                <p className="text-xs text-muted-foreground">{statusLabelMap[friend.status]}</p>
              </div>
              <SecurityBadges e2ee={friend.security.e2ee} invisible={friend.security.invisible} size={15} />
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === friend.id ? null : friend.id); }}
                className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground"
              >
                <MoreVertical size={18} />
              </button>

              <AnimatePresence>
                {menuOpen === friend.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-3 top-14 glass-panel py-1 z-20 min-w-[170px] neon-border"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenChat(friend.id, friend.name, ""); setMenuOpen(null); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 w-full"
                    >
                      <MessageCircle size={14} className="text-primary" /> {t("message")}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMuteTarget(friend.id); }} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 w-full">
                      <VolumeX size={14} className="text-yellow-400" /> {t("mute")}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleBlock(friend.id); }} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 w-full">
                      <Ban size={14} className="text-red-400" /> {friend.blocked ? t("unblock") : t("block")}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleStar(friend.id); }} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 w-full">
                      {friend.starred ? <StarOff size={14} className="text-primary" /> : <Star size={14} className="text-primary" />}
                      {friend.starred ? t("removeFromFavorites") : t("addToFavorites")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFriend(friend.id); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-secondary/50 w-full"
                    >
                      <Trash2 size={14} /> {t("deleteFriend")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <MuteModal open={!!muteTarget} onClose={() => setMuteTarget(null)} onMute={() => setMuteTarget(null)} />
    </div>
  );
};

export default FriendsList;
