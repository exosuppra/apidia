import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  currentConversation: Conversation | null;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | null>>;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  userId: string | null;
  isLoadingConversations: boolean;
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (!session?.user) {
        // Reset state on logout
        setConversations([]);
        setCurrentConversation(null);
        setHasLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadConversations = useCallback(async () => {
    if (!userId || hasLoaded) return;

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
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [userId, hasLoaded]);

  // Load conversations when userId changes
  useEffect(() => {
    if (userId && !hasLoaded) {
      loadConversations();
    }
  }, [userId, hasLoaded, loadConversations]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        conversations,
        setConversations,
        currentConversation,
        setCurrentConversation,
        showHistory,
        setShowHistory,
        userId,
        isLoadingConversations,
        loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
