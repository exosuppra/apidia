import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { Send, Bot, User, RefreshCw, MessageCircle } from "lucide-react";
import otoAvatar from "@/assets/char-oto.png";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { logUserAction } from "@/lib/logUserAction";

type TelegramMessage = {
  id: string;
  chat_id: number;
  text: string | null;
  direction: string;
  sender_name: string | null;
  created_at: string;
};

type ChatThread = {
  chat_id: number;
  sender_name: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export default function TelegramOTO() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Load all threads
  useEffect(() => {
    loadThreads();

    // Subscribe to realtime
    const channel = supabase
      .channel("telegram-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telegram_messages" }, (payload) => {
        const newMsg = payload.new as TelegramMessage;
        // Update threads
        loadThreads();
        // Update messages if this chat is selected
        if (newMsg.chat_id === selectedChat) {
          setMessages(prev => [...prev, newMsg]);
          setTimeout(scrollToBottom, 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat]);

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from("telegram_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return;

    // Group by chat_id
    const chatMap = new Map<number, { messages: TelegramMessage[]; senderName: string }>();
    for (const msg of data) {
      const chatId = Number(msg.chat_id);
      if (!chatMap.has(chatId)) {
        chatMap.set(chatId, { messages: [], senderName: msg.sender_name || "Inconnu" });
      }
      chatMap.get(chatId)!.messages.push(msg as TelegramMessage);
      if (msg.direction === "incoming" && msg.sender_name) {
        chatMap.get(chatId)!.senderName = msg.sender_name;
      }
    }

    const threadList: ChatThread[] = Array.from(chatMap.entries()).map(([chatId, { messages: msgs, senderName }]) => ({
      chat_id: chatId,
      sender_name: senderName,
      lastMessage: msgs[0]?.text || "(média)",
      lastAt: msgs[0]?.created_at || "",
      unread: msgs.filter(m => m.direction === "incoming").length,
    }));

    threadList.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    setThreads(threadList);
  };

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("telegram_messages")
        .select("*")
        .eq("chat_id", selectedChat)
        .order("created_at", { ascending: true })
        .limit(200);

      if (data) {
        setMessages(data as TelegramMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();
  }, [selectedChat]);

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
        toast({ title: `${data.processed} nouveau(x) message(s) récupéré(s)` });
        logUserAction("telegram_poll", { processed: data.processed });
        loadThreads();
      } else {
        toast({ title: "Aucun nouveau message" });
      }
    } catch {
      toast({ title: "Erreur de polling", variant: "destructive" });
    } finally {
      setPolling(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || sending) return;
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
          body: JSON.stringify({ chat_id: selectedChat, text: input }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      logUserAction("telegram_send", { chat_id: selectedChat });
      setInput("");
      // Warn if Make webhook failed
      if (data.telegram_sent && !data.make_notified && data.make_status !== "no_webhook") {
        toast({
          title: "Message envoyé sur Telegram",
          description: `⚠️ Le webhook Make n'a pas pu être notifié (${data.make_status})`,
          variant: "destructive",
        });
      }
      // Reload messages
      const { data: msgs } = await supabase
        .from("telegram_messages")
        .select("*")
        .eq("chat_id", selectedChat)
        .order("created_at", { ascending: true })
        .limit(200);
      if (msgs) {
        setMessages(msgs as TelegramMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e: any) {
      toast({ title: "Erreur d'envoi", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo title="OTO - Chatbot Telegram" description="Interface de gestion du chatbot Telegram OTO" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <img src={otoAvatar} alt="OTO" className="h-8 w-8" />
              OTO - Chat Telegram
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Interface de chat bidirectionnel avec les utilisateurs Telegram
            </p>
          </div>
          <Button variant="outline" onClick={triggerPoll} disabled={polling}>
            <RefreshCw className={`h-4 w-4 mr-2 ${polling ? "animate-spin" : ""}`} />
            {polling ? "Récupération..." : "Récupérer les messages"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
          {/* Thread list */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Conversations ({threads.length})</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-1 px-2 pb-2">
                {threads.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Aucune conversation. Lancez le polling pour récupérer les messages.
                  </p>
                )}
                {threads.map((thread) => (
                  <button
                    key={thread.chat_id}
                    onClick={() => setSelectedChat(thread.chat_id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChat === thread.chat_id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{thread.sender_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {thread.lastAt && format(new Date(thread.lastAt), "HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{thread.lastMessage}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedChat ? (
              <>
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-sm">
                      {threads.find(t => t.chat_id === selectedChat)?.sender_name || "Chat"}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      ID: {selectedChat}
                    </Badge>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            msg.direction === "outgoing"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          {msg.direction === "incoming" && (
                            <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
                          )}
                          <p>{msg.text || "(média non supporté)"}</p>
                          <p className="text-[10px] mt-1 opacity-50">
                            {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t p-3 shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Écrire un message..."
                      disabled={sending}
                    />
                    <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <img src={otoAvatar} alt="OTO" className="h-16 w-16 mx-auto opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez une conversation pour commencer
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
