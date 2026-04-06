import { ArrowLeft, Paperclip, Send, Smile, Image, FileText, Music, Check, CheckCheck, Phone, Video, Lock, Flag, Download, Play } from "lucide-react";
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
import { uploadMedia, formatFileSize, type MediaAttachment } from "@/lib/media";
import { subscribeToPresence, getPresenceStatus } from "@/lib/presence";
import { toast } from "@/hooks/use-toast";
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
  media?: MediaAttachment;
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
  const [uploading, setUploading] = useState(false);
  const [peerStatus, setPeerStatus] = useState<"online" | "away" | "offline">("offline");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { fingerprint } = useIdentity();

  // Presence subscription
  useEffect(() => {
    setPeerStatus(getPresenceStatus(chatId));
    const unsub = subscribeToPresence(chatId);
    const interval = setInterval(() => {
      setPeerStatus(getPresenceStatus(chatId));
    }, 5000);
    return () => { unsub(); clearInterval(interval); };
  }, [chatId]);

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
          media: (m as any).media,
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
              media: (msg as any).media,
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

  const handleFileSelect = async (accept: string) => {
    setShowAttach(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fingerprint) return;
    e.target.value = "";

    setUploading(true);
    try {
      const media = await uploadMedia(file);
      const msg: P2PMessage & { media: MediaAttachment } = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: fingerprint,
        to: chatId,
        text: "",
        timestamp: Date.now(),
        status: "sent",
        media,
      };
      const peerId = `trivo-${chatId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;
      await sendP2PMessage(peerId, msg as any);
      const existing = await getChatMeta(chatId);
      const mediaLabel = media.type === "image" ? "📷 " + t("photo") : media.type === "audio" ? "🎵 " + t("music") : "📎 " + t("file");
      await saveChatMeta({
        friendId: chatId,
        friendName: existing?.friendName || name,
        friendAvatar: existing?.friendAvatar,
        lastMessage: mediaLabel,
        lastMessageTime: Date.now(),
        unread: 0,
        started: true,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          text: "",
          sent: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "sent",
          media,
        },
      ]);
      toast({ title: t("mediaUploaded") || "Media sent" });
    } catch {
      toast({ title: t("mediaUploadFailed") || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const statusLabel = peerStatus === "online" ? t("online") : peerStatus === "away" ? t("away") : t("offline");
  const statusColor = peerStatus === "online" ? "text-primary" : peerStatus === "away" ? "text-yellow-500" : "text-muted-foreground";

  if (callType) {
    return <CallScreen name={name} type={callType} onEnd={() => setCallType(null)} />;
  }

  const renderMediaBubble = (media: MediaAttachment, sent: boolean) => {
    if (media.type === "image") {
      return (
        <a href={media.url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={media.url} alt={media.name} className="rounded-xl max-w-full max-h-[240px] object-cover" loading="lazy" />
        </a>
      );
    }
    if (media.type === "audio") {
      return (
        <div className="flex items-center gap-2">
          <Play size={16} className={sent ? "text-primary-foreground/80" : "text-primary"} />
          <audio controls src={media.url} className="max-w-[200px] h-8" preload="none" />
        </div>
      );
    }
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <FileText size={20} className={sent ? "text-primary-foreground/80" : "text-primary"} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{media.name}</p>
          <p className={`text-[10px] ${sent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatFileSize(media.size)}</p>
        </div>
        <Download size={14} className={sent ? "text-primary-foreground/60" : "text-muted-foreground"} />
      </a>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

      {/* Header */}
      <div className="glass-panel rounded-none border-x-0 border-t-0 px-3 py-3 flex items-center gap-3 z-10 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="relative">
          <DefaultAvatar size={36} />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
              peerStatus === "online" ? "bg-primary" : peerStatus === "away" ? "bg-yellow-500" : "bg-muted-foreground/40"
            }`}
            style={peerStatus === "online" ? { boxShadow: "0 0 6px hsl(var(--neon-glow) / 0.6)" } : {}}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-foreground">{name}</p>
            <SecurityBadges e2ee invisible={false} size={10} />
          </div>
          <p className={`text-[11px] ${statusColor}`}>{statusLabel}</p>
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
              {msg.media && renderMediaBubble(msg.media, msg.sent)}
              {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
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

      {/* Uploading indicator */}
      {uploading && (
        <div className="px-4 py-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">{t("uploading") || "Uploading..."}</span>
          </div>
        </div>
      )}

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
                { icon: Image, labelKey: "photo" as const, color: "text-blue-400", accept: "image/*" },
                { icon: FileText, labelKey: "file" as const, color: "text-orange-400", accept: ".pdf,.doc,.docx,.txt,.zip" },
                { icon: Music, labelKey: "music" as const, color: "text-pink-400", accept: "audio/*" },
              ].map(({ icon: Icon, labelKey, color, accept }) => (
                <button key={labelKey} onClick={() => handleFileSelect(accept)} className="flex flex-col items-center gap-1.5">
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
