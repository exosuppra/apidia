import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Plus, History, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  threadId: string;
  messages: Message[];
  createdAt: Date;
  title: string;
}

const STORAGE_KEY = "apidia-chat-conversations";

const loadConversations = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch {
    return [];
  }
};

const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
};

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (currentConversation) {
      const updated = conversations.map((c) =>
        c.id === currentConversation.id ? currentConversation : c
      );
      if (!conversations.find((c) => c.id === currentConversation.id)) {
        updated.push(currentConversation);
      }
      setConversations(updated);
      saveConversations(updated);
    }
  }, [currentConversation]);

  const startNewConversation = () => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      messages: [],
      createdAt: new Date(),
      title: "Nouvelle conversation",
    };
    setCurrentConversation(newConv);
    setShowHistory(false);
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setShowHistory(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentConversation) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedConv: Conversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      title:
        currentConversation.messages.length === 0
          ? input.trim().slice(0, 30) + (input.trim().length > 30 ? "..." : "")
          : currentConversation.title,
    };

    setCurrentConversation(updatedConv);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("make-chat", {
        body: { message: userMessage.content, threadId: currentConversation.threadId },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.response || "Réponse reçue de Make.",
        timestamp: new Date(),
      };

      setCurrentConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, assistantMessage] } : prev
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-card border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showHistory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setShowHistory(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {showHistory ? "Historique" : "Agent IA Make"}
                </h3>
                <p className="text-xs opacity-80">
                  {showHistory
                    ? `${conversations.length} conversation(s)`
                    : "Posez vos questions"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={startNewConversation}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Historique */}
          {showHistory ? (
            <ScrollArea className="flex-1 p-4">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune conversation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 rounded-lg border bg-background hover:bg-muted cursor-pointer transition-colors group"
                        onClick={() => selectConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(conv.createdAt), "dd MMM yyyy à HH:mm", {
                                locale: fr,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {conv.messages.length} message(s)
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          ) : !currentConversation ? (
            /* Écran d'accueil */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h4 className="font-semibold mb-2">Bienvenue !</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Démarrez une nouvelle conversation ou consultez l'historique.
              </p>
              <div className="flex gap-2">
                <Button onClick={startNewConversation} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle
                </Button>
                {conversations.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                    <History className="h-4 w-4 mr-2" />
                    Historique
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Messages */
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {currentConversation.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Commencez la conversation</p>
                    <p className="text-xs mt-1">Votre message sera traité par Make</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t bg-background">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écrivez votre message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
