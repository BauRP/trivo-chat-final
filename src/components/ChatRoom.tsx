import { ArrowLeft, Paperclip, Send, Smile, Image, FileText, Music, Check, CheckCheck, Phone, Video, Lock, Flag } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIdentity } from "@/contexts/IdentityContext";
import DefaultAvatar from "./DefaultAvatar";
import SecurityBadges from "./SecurityBadges";
import CallScreen from "./CallScreen";
import ReportMenu from "./ReportMenu";
import {
  sendP2PMessage,
  getMessagesForChat,
  onP2PMessage,
  connectToPeer,
  saveChatMeta,
  getChatMeta,
  type P2PMessage,
} from "@/lib/p2p";

interface Message {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  status: "sent" | "read";
}

interface ChatRoomProps {
  chatId: string;
  name: string;
  emoji: string;
  onBack: () => void;
}

const ChatRoom = ({ chatId, name, emoji, onBack }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { fingerprint } = useIdentity();

  useEffect(() => {
    const loadMessages = async () => {
      const stored = await getMessagesForChat(chatId);
      if (stored.length === 0) setSessionStarted(true);
      setMessages(
        stored.map((m) => ({
          id: m.id,
          text: m.text,
          sent: m.from === fingerprint,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: m.status === "read" ? "read" : "sent",
        }))
      );
    };
    loadMessages();
    const peerId = `trivo-${chatId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;
    connectToPeer(peerId);
  }, [chatId, fingerprint]);

  useEffect(() => {
    const unsub = onP2PMessage((msg: P2PMessage) => {
      if (msg.from === chatId || msg.to === chatId) {
        setMessages((prev: Message[]) => {
          if (prev.some((m: Message) => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              id: msg.id,
              text: msg.text,
              sent: msg.from === fingerprint,
              time: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              status: "sent",
            },
          ];
        });
        setSessionStarted(false);
      }
    });
    return unsub;
  }, [chatId, fingerprint]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !fingerprint) return;
    const msg: P2PMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: fingerprint,
      to: chatId,
      text: input,
      timestamp: Date.now(),
      status: "sent",
    };
    const peerId = `trivo-${chatId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;
    await sendP2PMessage(peerId, msg);
    const existing = await getChatMeta(chatId);
    await saveChatMeta({
      friendId: chatId,
      friendName: existing?.friendName || name,
      friendAvatar: existing?.friendAvatar,
      lastMessage: input,
      lastMessageTime: Date.now(),
      unread: 0,
      started: true,
    });
    setMessages((prev) => [
      ...prev,
      { id: msg.id, text: input, sent: true, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), status: "sent" },
    ]);
    setInput("");
    setShowEmoji(false);
    setSessionStarted(false);
  };

  if (callType) {
    return <CallScreen name={name} type={callType} onEnd={() => setCallType(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-panel rounded-none border-x-0 border-t-0 px-3 py-3 flex items-center gap-3 z-10 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <DefaultAvatar size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-foreground">{name}</p>
            <SecurityBadges e2ee invisible={false} size={10} />
          </div>
          <p className="text-[11px] text-primary">{t("online")}</p>
        </div>
        <button onClick={() => setCallType("audio")} className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground">
          <Phone size={20} />
        </button>
        <button onClick={() => setCallType("video")} className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground">
          <Video size={20} />
        </button>
        <button onClick={() => setShowReport(true)} className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground">
          <Flag size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-2">
        {sessionStarted && messages.length === 0 && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel-sm neon-border">
              <Lock size={12} className="text-primary" />
              <span className="text-xs text-muted-foreground">
                {t("e2eSessionStarted")}
              </span>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.sent ? 20 : -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                msg.sent
                  ? "bg-primary text-primary-foreground rounded-br-md neon-glow"
                  : "glass-panel-sm rounded-bl-md"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <div className={`flex items-center gap-1 justify-end mt-1 ${msg.sent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                <span className="text-[10px]">{msg.time}</span>
                {msg.sent && (
                  msg.status === "sent"
                    ? <Check size={12} />
                    : <CheckCheck size={12} className="text-primary-foreground/80" />
                )}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30"
          >
            <EmojiPicker
              onEmojiClick={(e) => setInput((prev) => prev + e.emoji)}
              width="100%"
              height={320}
              theme={theme === "dark" ? "dark" as any : "light" as any}
              searchDisabled
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment menu */}
      <AnimatePresence>
        {showAttach && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30 px-4 py-3"
          >
            <div className="flex gap-6 justify-center">
              {[
                { icon: Image, labelKey: "photo" as const, color: "text-blue-400" },
                { icon: FileText, labelKey: "file" as const, color: "text-orange-400" },
                { icon: Music, labelKey: "music" as const, color: "text-pink-400" },
              ].map(({ icon: Icon, labelKey, color }) => (
                <button key={labelKey} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full glass-panel-sm flex items-center justify-center neon-border">
                    <Icon size={20} className={color} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="glass-panel rounded-none border-x-0 border-b-0 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => { setShowEmoji((p) => !p); setShowAttach(false); }}
          className={`p-2 rounded-lg transition-colors ${showEmoji ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Smile size={22} />
        </button>
        <button
          onClick={() => { setShowAttach((p) => !p); setShowEmoji(false); }}
          className={`p-2 rounded-lg transition-colors ${showAttach ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Paperclip size={22} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={t("typeMessage")}
          className="glass-input flex-1 py-2 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:neon-glow"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Report Modal */}
      <ReportMenu userId={chatId} open={showReport} onClose={() => setShowReport(false)} />
    </div>
  );
};

export default ChatRoom;
