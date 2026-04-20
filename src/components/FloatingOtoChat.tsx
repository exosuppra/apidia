import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import otoAvatar from "@/assets/char-oto.png";

type TelegramMessage = {
  id: string;
  chat_id: number;
  text: string | null;
  direction: string;
  sender_name: string | null;
  created_at: string;
};

export default function FloatingOtoChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [latestChatId, setLatestChatId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Load latest chat thread
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("telegram_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) return;

    // Find the most recent chat_id
    const chatId = Number(data[0].chat_id);
    setLatestChatId(chatId);

    const chatMessages = data
      .filter((m) => Number(m.chat_id) === chatId)
      .reverse() as TelegramMessage[];

    setMessages(chatMessages);
    setTimeout(scrollToBottom, 100);
  };

  // Subscribe to realtime
  useEffect(() => {
    if (!isOpen) return;

    loadMessages();

    const channel = supabase
      .channel("oto-floating-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telegram_messages" },
        (payload) => {
          const newMsg = payload.new as TelegramMessage;
          if (latestChatId && Number(newMsg.chat_id) === latestChatId) {
            setMessages((prev) => [...prev, newMsg]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, latestChatId]);

  const triggerPoll = async () => {
    setPolling(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-poll`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      const data = await resp.json();
      if (data.processed > 0) {
        toast({ title: `${data.processed} nouveau(x) message(s)` });
        loadMessages();
      }
    } catch {
      toast({ title: "Erreur de polling", variant: "destructive" });
    } finally {
      setPolling(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !latestChatId || sending) return;
    setSending(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ chat_id: latestChatId, text: input }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setInput("");
      loadMessages();
      // Warn if Make webhook failed
      if (data.telegram_sent && !data.make_notified && data.make_status !== "no_webhook") {
        toast({
          title: "⚠️ Webhook Make non notifié",
          description: `Statut: ${data.make_status}`,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Erreur d'envoi",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating OTO button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-50 overflow-hidden border-2 border-primary/30 hover:border-primary transition-colors hover:scale-105 active:scale-95"
        title="Contacter OTO"
      >
        <img
          src={otoAvatar}
          alt="OTO"
          className="h-full w-full object-cover"
        />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-44 right-6 w-80 sm:w-96 h-[500px] bg-card border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={otoAvatar}
                alt="OTO"
                className="h-9 w-9 rounded-full border-2 border-white/30"
              />
              <div>
                <h3 className="font-semibold text-sm">OTO</h3>
                <p className="text-xs opacity-80">Chat Telegram</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={triggerPoll}
                disabled={polling}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${polling ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <img
                  src={otoAvatar}
                  alt="OTO"
                  className="h-16 w-16 opacity-30 mb-3"
                />
                <p className="text-sm text-muted-foreground">
                  Aucun message pour le moment
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les messages Telegram apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "outgoing"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.direction === "outgoing"
                          ? "bg-orange-500 text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.direction === "incoming" && msg.sender_name && (
                        <p className="text-[10px] font-medium mb-0.5 opacity-70">
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="break-words">{msg.text || "(média)"}</p>
                      <p className="text-[10px] mt-0.5 opacity-50">
                        {format(new Date(msg.created_at), "HH:mm", {
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-2">
            {!latestChatId ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Aucune conversation Telegram active
              </p>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage()
                  }
                  placeholder="Répondre via OTO..."
                  disabled={sending}
                  className="text-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  size="icon"
                  className="bg-orange-500 hover:bg-orange-600 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
