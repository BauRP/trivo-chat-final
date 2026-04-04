import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import ChatList from "@/components/ChatList";
import ChatRoom from "@/components/ChatRoom";
import AddFriend from "@/components/AddFriend";
import FriendsList from "@/components/FriendsList";
import ProfilePage from "@/components/ProfilePage";
import SecurityDashboard from "@/components/SecurityDashboard";
import AdMobBanner from "@/components/AdMobBanner";
import { useIdentity } from "@/contexts/IdentityContext";
import { initPeer, onP2PMessage, onConnectionChange, flushPendingMessages, saveChatMeta, getChatMeta, type P2PMessage } from "@/lib/p2p";
import { executePanic, createPanicLongPress } from "@/lib/panic";

type Tab = "chats" | "add-friend" | "friends" | "security" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [openChat, setOpenChat] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { fingerprint, stealthMode } = useIdentity();

  // Panic trigger: long-press on the top-left area (3s hold)
  const panicHandlers = useMemo(() => createPanicLongPress(executePanic), []);

  // Initialize P2P
  useEffect(() => {
    if (!fingerprint) return;
    initPeer(fingerprint).catch(() => {});

    const unsubMsg = onP2PMessage(async (msg: P2PMessage) => {
      const existing = await getChatMeta(msg.from);
      await saveChatMeta({
        friendId: msg.from,
        friendName: existing?.friendName || msg.from.substring(0, 8),
        friendAvatar: existing?.friendAvatar,
        lastMessage: msg.text || "New message",
        lastMessageTime: msg.timestamp,
        unread: (existing?.unread || 0) + 1,
        started: true,
      });
    });

    const unsubConn = onConnectionChange((peerId, connected) => {
      if (connected) {
        flushPendingMessages(peerId);
      }
    });

    return () => {
      unsubMsg();
      unsubConn();
    };
  }, [fingerprint]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleOpenChat = (id: string, name: string, emoji: string) => {
    setOpenChat({ id, name, emoji });
  };

  // Show AdMob only when online AND not in stealth mode
  const showAd = isOnline && !stealthMode;

  if (openChat) {
    return (
      <div className="h-[100dvh] max-w-md mx-auto flex flex-col overflow-hidden" style={{ backgroundImage: "var(--gradient-bg)" }}>
        {showAd && <AdMobBanner stealthMode={stealthMode} />}
        <ChatRoom
          chatId={openChat.id}
          name={openChat.name}
          emoji={openChat.emoji}
          onBack={() => setOpenChat(null)}
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-w-md mx-auto flex flex-col overflow-hidden" style={{ backgroundImage: "var(--gradient-bg)" }}>
      {showAd && <AdMobBanner stealthMode={stealthMode} />}
      {/* Invisible panic trigger zone — long-press top-left corner for 3s */}
      <div
        {...panicHandlers}
        className="absolute top-0 left-0 w-12 h-12 z-50"
        aria-hidden="true"
      />
      <div className="flex-1 min-h-0 overflow-hidden pb-[72px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-y-auto scrollbar-hide"
          >
            {activeTab === "chats" && <ChatList onOpenChat={handleOpenChat} />}
            {activeTab === "add-friend" && <AddFriend />}
            {activeTab === "friends" && <FriendsList onOpenChat={handleOpenChat} />}
            {activeTab === "security" && <SecurityDashboard />}
            {activeTab === "profile" && <ProfilePage />}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
