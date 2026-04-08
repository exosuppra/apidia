import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, BookOpen, Loader2, ExternalLink } from "lucide-react";
import Seo from "@/components/Seo";

type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES = [
  "general", "hébergement", "restauration", "activités",
  "événements", "transport", "infos pratiques", "bons plans",
];

export default function ApidiaKnowledge() {
  const { toast } = useToast();
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null);
  const [formCategory, setFormCategory] = useState("general");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

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
      <Seo title="Apidia - Base de connaissances" description="Gérer la base de connaissances d'Apidia" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Apidia : Base de connaissances
          </h1>
          <p className="text-muted-foreground">Enrichissez les connaissances d'Apidia pour améliorer ses réponses</p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <a href="/apidia" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Ouvrir le chatbot Apidia
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Connaissances complémentaires</CardTitle>
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
                          <Switch checked={entry.is_active} onCheckedChange={() => toggleActive(entry)} />
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
                <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Décrivez l'information en détail..." rows={5} />
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
