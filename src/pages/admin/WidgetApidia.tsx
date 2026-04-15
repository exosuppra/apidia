import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { ArrowLeft, Code, Copy, Plus, Trash2, Eye, LayoutGrid, Map, Layers, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { logUserAction } from "@/lib/logUserAction";

type Widget = {
  id: string;
  name: string;
  widget_type: string;
  filters: any;
  selected_fiche_ids: string[];
  settings: any;
  is_active: boolean;
  share_token: string;
  created_at: string;
};

const FICHE_TYPES = [
  "FETE_ET_MANIFESTATION", "RESTAURATION", "HEBERGEMENT_LOCATIF", "HOTELLERIE",
  "HOTELLERIE_PLEIN_AIR", "ACTIVITE", "PATRIMOINE_CULTUREL", "PATRIMOINE_NATUREL",
  "EQUIPEMENT", "COMMERCE_ET_SERVICE", "DEGUSTATION", "STRUCTURE", "HEBERGEMENT_COLLECTIF",
];

const WIDGET_TYPES = [
  { value: "carousel", label: "Carrousel", icon: Layers },
  { value: "grid", label: "Grille", icon: LayoutGrid },
  { value: "map", label: "Carte", icon: Map },
];

export default function WidgetApidia() {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [communes, setCommunes] = useState<string[]>([]);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [widgetType, setWidgetType] = useState("carousel");
  const [ficheType, setFicheType] = useState("");
  const [commune, setCommune] = useState("");
  const [source, setSource] = useState("");
  const [manualIds, setManualIds] = useState("");
  const [maxFiches, setMaxFiches] = useState(10);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    loadWidgets();
    loadCommunes();
  }, []);

  const loadWidgets = async () => {
    const { data, error } = await supabase
      .from("apidia_widgets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setWidgets(data as Widget[]);
    setLoading(false);
  };

  const loadCommunes = async () => {
    const { data } = await supabase
      .from("fiches_data")
      .select("data")
      .eq("is_published", true)
      .limit(1000);

    if (data) {
      const communeSet = new Set<string>();
      data.forEach((f: any) => {
        const c = f.data?.localisation?.adresse?.commune?.nom;
        if (c) communeSet.add(c);
      });
      setCommunes(Array.from(communeSet).sort());
    }
  };

  const createWidget = async () => {
    if (!name.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }

    const filters: any = {};
    if (ficheType && ficheType !== "all") filters.fiche_type = ficheType;
    if (commune && commune !== "all") filters.commune = commune;
    if (source && source !== "all") filters.source = source;

    const selectedIds = manualIds.trim()
      ? manualIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("apidia_widgets").insert({
      name,
      widget_type: widgetType,
      filters,
      selected_fiche_ids: selectedIds,
      settings: { max_fiches: maxFiches, theme },
      created_by: userData.user?.id,
    });

    if (error) {
      toast({ title: "Erreur de création", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Widget créé avec succès" });
      logUserAction("widget_create", { name, widget_type: widgetType });
      resetForm();
      setShowCreate(false);
      loadWidgets();
    }
  };

  const toggleActive = async (widget: Widget) => {
    await supabase
      .from("apidia_widgets")
      .update({ is_active: !widget.is_active })
      .eq("id", widget.id);
    loadWidgets();
  };

  const deleteWidget = async (id: string) => {
    if (!confirm("Supprimer ce widget ?")) return;
    await supabase.from("apidia_widgets").delete().eq("id", id);
    logUserAction("widget_delete", { id });
    toast({ title: "Widget supprimé" });
    loadWidgets();
  };

  const resetForm = () => {
    setName("");
    setWidgetType("carousel");
    setFicheType("");
    setCommune("");
    setSource("");
    setManualIds("");
    setMaxFiches(10);
    setTheme("light");
  };

  const getIframeCode = (widget: Widget) => {
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}/widget/${widget.share_token}" width="100%" height="500" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;
  };

  const getScriptCode = (widget: Widget) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `<div id="apidia-widget-${widget.share_token}"></div>
<script>
(function() {
  var container = document.getElementById('apidia-widget-${widget.share_token}');
  var iframe = document.createElement('iframe');
  iframe.src = '${window.location.origin}/widget/${widget.share_token}';
  iframe.style.cssText = 'width:100%;border:none;border-radius:8px;min-height:500px;';
  iframe.onload = function() {
    // Auto-resize based on content
    try {
      iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    } catch(e) {}
  };
  container.appendChild(iframe);
})();
</script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Code copié dans le presse-papier" });
  };

  const WidgetTypeIcon = ({ type }: { type: string }) => {
    const t = WIDGET_TYPES.find((wt) => wt.value === type);
    if (!t) return null;
    const Icon = t.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <>
      <Seo title="Widget Apidia" description="Créer et gérer les widgets d'intégration Apidia" />
      <Card className="p-6">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Code className="h-6 w-6" />
              Widget Apidia
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Créez des widgets pour intégrer les fiches touristiques sur des sites externes
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau widget
          </Button>
        </div>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un widget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom du widget</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Restaurants de Manosque" />
              </div>

              <div>
                <Label>Type d'affichage</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {WIDGET_TYPES.map((wt) => (
                    <button
                      key={wt.value}
                      onClick={() => setWidgetType(wt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                        widgetType === wt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <wt.icon className="h-5 w-5" />
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Type de fiche</Label>
                <Select value={ficheType} onValueChange={setFicheType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {FICHE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Commune</Label>
                <Select value={commune} onValueChange={setCommune}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les communes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les communes</SelectItem>
                    {communes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    <SelectItem value="apidae_sync">Apidae</SelectItem>
                    <SelectItem value="make_webhook">Make Webhook</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>IDs de fiches manuels (optionnel, séparés par des virgules)</Label>
                <Input
                  value={manualIds}
                  onChange={(e) => setManualIds(e.target.value)}
                  placeholder="Ex: 7708821, 4672291, 7708028"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre max de fiches</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxFiches}
                    onChange={(e) => setMaxFiches(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Thème</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Clair</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full" onClick={createWidget}>
                Créer le widget
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Widgets list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : widgets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Code className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Aucun widget créé pour le moment</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier widget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {widgets.map((w) => (
              <Card key={w.id} className={!w.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WidgetTypeIcon type={w.widget_type} />
                      <CardTitle className="text-sm">{w.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={w.is_active ? "default" : "secondary"}>
                        {w.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w)} />
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{WIDGET_TYPES.find((t) => t.value === w.widget_type)?.label}</Badge>
                    {w.filters?.fiche_type && <Badge variant="outline">{w.filters.fiche_type.replace(/_/g, " ")}</Badge>}
                    {w.filters?.commune && <Badge variant="outline">{w.filters.commune}</Badge>}
                    {w.selected_fiche_ids?.length > 0 && (
                      <Badge variant="outline">{w.selected_fiche_ids.length} fiches sélectionnées</Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedWidget(w)}>
                          <Code className="h-3 w-3 mr-1" />
                          Code d'intégration
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Code d'intégration : {w.name}</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="iframe">
                          <TabsList>
                            <TabsTrigger value="iframe">Iframe</TabsTrigger>
                            <TabsTrigger value="script">Script JS</TabsTrigger>
                          </TabsList>
                          <TabsContent value="iframe" className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Copiez ce code et collez-le dans votre page HTML à l'endroit souhaité.
                            </p>
                            <div className="relative">
                              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                {getIframeCode(w)}
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(getIframeCode(w))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TabsContent>
                          <TabsContent value="script" className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Ce script crée automatiquement le widget avec auto-redimensionnement.
                            </p>
                            <div className="relative">
                              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                {getScriptCode(w)}
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(getScriptCode(w))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/widget/${w.share_token}`, "_blank")}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Prévisualiser
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteWidget(w.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </Card>
    </>
  );
}
