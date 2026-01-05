import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Plus, History, ChevronLeft, Search, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MessageContent from "@/components/chat/MessageContent";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

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

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return null;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error !== "aborted") {
        toast({
          title: "Erreur de reconnaissance vocale",
          description: "Impossible d'accéder au microphone.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [toast]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        recognitionRef.current = initSpeechRecognition();
      }
      
      if (!recognitionRef.current) {
        toast({
          title: "Non supporté",
          description: "La reconnaissance vocale n'est pas supportée par votre navigateur.",
          variant: "destructive",
        });
        return;
      }

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  }, [isListening, initSpeechRecognition, toast]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Load conversations from database
  useEffect(() => {
    if (!userId) return;

    const loadConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const { data: convData, error: convError } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (convError) throw convError;

        const conversationsWithMessages: Conversation[] = await Promise.all(
          (convData || []).map(async (conv) => {
            const { data: msgData } = await supabase
              .from("chat_messages")
              .select("*")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true });

            return {
              id: conv.id,
              threadId: conv.thread_id,
              title: conv.title,
              createdAt: new Date(conv.created_at),
              messages: (msgData || []).map((msg) => ({
                id: msg.id,
                role: msg.role as "user" | "assistant",
                content: msg.content,
                timestamp: new Date(msg.created_at),
              })),
            };
          })
        );

        setConversations(conversationsWithMessages);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  const startNewConversation = async () => {
    if (!userId) return;

    const threadId = crypto.randomUUID();
    const newConvId = crypto.randomUUID();

    try {
      const { error } = await supabase.from("chat_conversations").insert({
        id: newConvId,
        thread_id: threadId,
        user_id: userId,
        title: "Nouvelle conversation",
      });

      if (error) throw error;

      const newConv: Conversation = {
        id: newConvId,
        threadId,
        messages: [],
        createdAt: new Date(),
        title: "Nouvelle conversation",
      };

      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setShowHistory(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation.",
        variant: "destructive",
      });
    }
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setShowHistory(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentConversation || !userId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const isFirstMessage = currentConversation.messages.length === 0;
    const newTitle = isFirstMessage
      ? input.trim().slice(0, 30) + (input.trim().length > 30 ? "..." : "")
      : currentConversation.title;

    // Update local state immediately
    const updatedConv: Conversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      title: newTitle,
    };
    setCurrentConversation(updatedConv);
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from("chat_messages").insert({
        id: userMessage.id,
        conversation_id: currentConversation.id,
        role: "user",
        content: userMessage.content,
      });

      // Update title if first message
      if (isFirstMessage) {
        await supabase
          .from("chat_conversations")
          .update({ title: newTitle })
          .eq("id", currentConversation.id);
      }

      // Prepare messages history for AI with tools
      const messagesHistory = [...currentConversation.messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call AI chat function with full conversation history
      const { data, error } = await supabase.functions.invoke("make-chat", {
        body: { messages: messagesHistory, threadId: currentConversation.threadId },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.response || "Réponse reçue de Make.",
        timestamp: new Date(),
      };

      // Save assistant message to database
      await supabase.from("chat_messages").insert({
        id: assistantMessage.id,
        conversation_id: currentConversation.id,
        role: "assistant",
        content: assistantMessage.content,
      });

      // Update conversation updated_at
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation.id);

      setCurrentConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, assistantMessage] } : prev
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversation.id
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
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

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation.",
        variant: "destructive",
      });
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = conv.title.toLowerCase().includes(query);
    const messageMatch = conv.messages.some((msg) =>
      msg.content.toLowerCase().includes(query)
    );
    return titleMatch || messageMatch;
  });

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
                    ? `${filteredConversations.length} conversation(s)`
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
            <div className="flex-1 flex flex-col">
              {/* Search bar */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery ? "Aucun résultat" : "Aucune conversation"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conv) => (
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
            </div>
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
                          className={`max-w-[85%] rounded-lg px-3 py-2 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <MessageContent content={msg.content} isUser={msg.role === "user"} />
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
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? "destructive" : "outline"}
                    onClick={toggleListening}
                    disabled={isLoading}
                    className="shrink-0"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Parlez maintenant..." : "Écrivez votre message..."}
                    disabled={isLoading}
                    className={`flex-1 ${isListening ? "border-destructive" : ""}`}
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {isListening && (
                  <p className="text-xs text-destructive mt-2 text-center animate-pulse">
                    🎤 Écoute en cours...
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
