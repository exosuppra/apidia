import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, Plus, Trash2, Edit2, BookOpen, MessageCircle, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES = [
  "general",
  "hébergement",
  "restauration",
  "activités",
  "événements",
  "transport",
  "infos pratiques",
  "bons plans",
];

export default function ApidiaChatbot() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null);
  const [formCategory, setFormCategory] = useState("general");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchKnowledge = useCallback(async () => {
    const { data, error } = await supabase
      .from("apidia_knowledge")
      .select("*")
      .order("category")
      .order("created_at", { ascending: false });
    if (!error && data) setKnowledge(data as KnowledgeEntry[]);
    setKnowledgeLoading(false);
  }, []);

  useEffect(() => { fetchKnowledge(); }, [fetchKnowledge]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { 
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKnowledge = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({ title: "Erreur", description: "Titre et contenu requis", variant: "destructive" });
      return;
    }

    if (editEntry) {
      const { error } = await supabase.from("apidia_knowledge").update({
        category: formCategory, title: formTitle, content: formContent,
      }).eq("id", editEntry.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Modifié", description: "Entrée mise à jour" });
    } else {
      const { error } = await supabase.from("apidia_knowledge").insert({
        category: formCategory, title: formTitle, content: formContent,
      });
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Ajouté", description: "Nouvelle connaissance ajoutée" });
    }

    setShowAddDialog(false);
    setEditEntry(null);
    setFormCategory("general");
    setFormTitle("");
    setFormContent("");
    fetchKnowledge();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("apidia_knowledge").delete().eq("id", id);
    if (!error) { fetchKnowledge(); toast({ title: "Supprimé" }); }
  };

  const toggleActive = async (entry: KnowledgeEntry) => {
    await supabase.from("apidia_knowledge").update({ is_active: !entry.is_active }).eq("id", entry.id);
    fetchKnowledge();
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditEntry(entry);
    setFormCategory(entry.category);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setShowAddDialog(true);
  };

  const openAdd = () => {
    setEditEntry(null);
    setFormCategory("general");
    setFormTitle("");
    setFormContent("");
    setShowAddDialog(true);
  };

  const filteredKnowledge = filterCategory === "all"
    ? knowledge
    : knowledge.filter(k => k.category === filterCategory);

  return (
    <>
      <Seo title="Apidia - Agent d'accueil virtuel" description="Chatbot conseiller en séjour" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Apidia : Agent d'accueil virtuel
          </h1>
          <p className="text-muted-foreground">Chatbot conseiller en séjour basé sur les données Apidae et votre base de connaissances</p>
        </div>

        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              Tester le chatbot
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              Base de connaissances ({knowledge.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversation de test</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-20">
                      <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Bonjour ! Je suis Apidia, votre conseiller en séjour.</p>
                      <p className="text-xs mt-1">Posez une question pour tester le chatbot.</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Que souhaitez-vous savoir sur le Verdon ?"
                    disabled={isLoading}
                  />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Base de connaissances complémentaire</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openAdd} size="sm">
                    <Plus className="w-4 h-4 mr-1" />Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {knowledgeLoading ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : filteredKnowledge.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune connaissance ajoutée.</p>
                    <p className="text-xs mt-1">Ajoutez des informations pour enrichir les réponses d'Apidia.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredKnowledge.map(entry => (
                      <div key={entry.id} className={`border rounded-lg p-4 ${!entry.is_active ? "opacity-50" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">{entry.category}</Badge>
                              <span className="font-medium text-sm">{entry.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-1 mr-2">
                              <Switch
                                checked={entry.is_active}
                                onCheckedChange={() => toggleActive(entry)}
                              />
                              <Label className="text-xs">{entry.is_active ? "Actif" : "Inactif"}</Label>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(entry.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editEntry ? "Modifier" : "Ajouter"} une connaissance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titre</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Horaires navette Verdon" />
              </div>
              <div>
                <Label>Contenu</Label>
                <Textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Décrivez l'information en détail..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSaveKnowledge} className="w-full">
                {editEntry ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
