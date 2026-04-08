import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, Loader2, ArrowLeft, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import Seo from "@/components/Seo";
import ReactMarkdown from "react-markdown";
import FichePreviewCard, { FichePreview } from "@/components/chat/FichePreviewCard";
import { useNavigate } from "react-router-dom";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";

type Msg = { role: "user" | "assistant"; content: string; fichesPreview?: FichePreview[] };

const SUGGESTIONS = [
  "Que faire ce week-end dans le Verdon ?",
  "Où manger à Manosque ?",
  "Quelles randonnées recommandez-vous ?",
  "Y a-t-il des événements en ce moment ?",
];

export default function ApidiaChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { isListening, transcript, startListening, stopListening, isSupported: sttSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // When transcript changes from speech recognition, update input
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // When user stops listening and has a transcript, auto-send
  useEffect(() => {
    if (!isListening && transcript) {
      sendMessage(transcript);
    }
  }, [isListening]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    const userMsg: Msg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let pendingFiches: FichePreview[] = [];
    const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apidia-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
        throw new Error(err.error || `Erreur ${resp.status}`);
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.fiches_previews) {
              pendingFiches = parsed.fiches_previews;
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1
                    ? { ...m, content: assistantSoFar, fichesPreview: pendingFiches.length > 0 ? pendingFiches : m.fichesPreview }
                    : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar, fichesPreview: pendingFiches.length > 0 ? pendingFiches : undefined }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (pendingFiches.length > 0 && assistantSoFar) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.fichesPreview) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, fichesPreview: pendingFiches } : m);
          }
          return prev;
        });
      }

      // Auto-speak the response if enabled
      if (autoSpeak && assistantSoFar) {
        speak(assistantSoFar);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      <Seo title="Apidia - Conseiller en séjour" description="Votre conseiller en séjour virtuel pour le Verdon et la Provence" />
      <div className="h-[100dvh] bg-background flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight">Apidia</h1>
              <p className="text-xs text-muted-foreground">Conseiller en séjour virtuel</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ttsSupported && (
              <Button
                variant={autoSpeak ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setAutoSpeak(!autoSpeak);
                }}
                title={autoSpeak ? "Désactiver la voix" : "Activer la voix"}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">En ligne</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Bonjour ! 👋</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Je suis Apidia, votre conseiller en séjour virtuel. Posez-moi une question sur le Verdon et la Provence !
                </p>
                {(sttSupported || ttsSupported) && (
                  <p className="text-xs text-muted-foreground max-w-sm mt-2">
                    🎙️ Vous pouvez aussi me parler en utilisant le micro, et j'activerai la voix pour vous répondre !
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm px-3 py-2.5 rounded-xl border bg-background hover:bg-muted/50 transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] space-y-2`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Apidia</span>
                    {ttsSupported && msg.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1"
                        onClick={() => isSpeaking ? stopSpeaking() : speak(msg.content)}
                        title="Écouter la réponse"
                      >
                        {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>

                {msg.fichesPreview && msg.fichesPreview.length > 0 && (
                  <div className="overflow-x-auto pb-2 -mx-1">
                    <div className="flex gap-2 px-1" style={{ minWidth: "min-content" }}>
                      {msg.fichesPreview.map((fiche) => (
                        <FichePreviewCard key={fiche.fiche_id} fiche={fiche} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t bg-background px-4 py-3 shrink-0">
          <div className="flex gap-2 max-w-2xl mx-auto">
            {sttSupported && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className={`rounded-full shrink-0 h-10 w-10 ${isListening ? "animate-pulse" : ""}`}
                onClick={handleMicClick}
                disabled={isLoading}
                title={isListening ? "Arrêter l'écoute" : "Parler"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={isListening ? "🎙️ Je vous écoute..." : "Que souhaitez-vous savoir ?"}
              disabled={isLoading}
              className="flex-1 h-10 rounded-full border border-input bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="rounded-full shrink-0 h-10 w-10"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
