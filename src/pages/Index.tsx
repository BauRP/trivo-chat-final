import { useState, useEffect, useCallback } from "react";
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

type Tab = "chats" | "add-friend" | "friends" | "security" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [openChat, setOpenChat] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { fingerprint } = useIdentity();

  // Initialize P2P
  useEffect(() => {
    if (!fingerprint) return;
    initPeer(fingerprint).catch(console.warn);

    const unsubMsg = onP2PMessage(async (msg: P2PMessage) => {
      // Update chat meta when receiving a message
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

  if (openChat) {
    return (
      <div className="h-[100dvh] max-w-md mx-auto flex flex-col overflow-hidden" style={{ backgroundImage: "var(--gradient-bg)" }}>
        {isOnline && <AdMobBanner />}
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
      {isOnline && <AdMobBanner />}
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
