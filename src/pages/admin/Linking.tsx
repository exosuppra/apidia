import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Search, Upload, RefreshCw, Mail, Plus, ExternalLink, Check, AlertTriangle, Clock, Loader2, Edit2, Trash2, Eye, X, Info, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Seo from "@/components/Seo";
import * as XLSX from "xlsx";

type Commune = { id: string; nom: string; created_at: string };
type Site = {
  id: string;
  commune_id: string;
  type_contenu: string | null;
  url: string;
  date_mise_a_jour: string | null;
  date_dernier_controle: string | null;
  statut: string;
  modifications: string | null;
  date_contact: string | null;
  reponse: string | null;
  contact_email: string | null;
  contact_notes: string | null;
  last_scrape_result: any;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
};

type SiteWithCommune = Site & { commune_nom: string };

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check }> = {
  ok: { label: "OK", variant: "default", icon: Check },
  a_modifier: { label: "À modifier", variant: "destructive", icon: AlertTriangle },
  en_attente: { label: "En attente", variant: "secondary", icon: Clock },
};

export default function Linking() {
  const { toast } = useToast();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [sites, setSites] = useState<SiteWithCommune[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCommune, setFilterCommune] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteWithCommune | null>(null);
  const [editSite, setEditSite] = useState<SiteWithCommune | null>(null);
  const [newCommune, setNewCommune] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Bulk check state
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentSite: "" });
  const bulkAbortRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      supabase.from("linking_communes").select("*").order("nom"),
      supabase.from("linking_sites").select("*").order("created_at"),
    ]);

    const communesList = (cRes.data || []) as Commune[];
    setCommunes(communesList);

    const communeMap = Object.fromEntries(communesList.map(c => [c.id, c.nom]));
    const sitesData = ((sRes.data || []) as Site[]).map(s => ({
      ...s,
      commune_nom: communeMap[s.commune_id] || "Inconnu",
    }));
    setSites(sitesData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSites = sites.filter(s => {
    if (filterCommune !== "all" && s.commune_id !== filterCommune) return false;
    if (filterStatut !== "all" && s.statut !== filterStatut) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return s.url.toLowerCase().includes(term) || s.commune_nom.toLowerCase().includes(term) || (s.type_contenu || "").toLowerCase().includes(term);
    }
    return true;
  });

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let currentCommune = "";
      const entries: { commune: string; type: string; url: string; dateMaj: string; dateControle: string; modifications: string; dateContact: string; reponse: string; contactEmail: string; contactNotes: string }[] = [];

      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 4) continue;
        const communeVal = (row[0] || "").toString().trim();
        if (communeVal) currentCommune = communeVal;
        if (!currentCommune) continue;
        const type = (row[1] || "").toString().trim();
        const dateMaj = (row[2] || "").toString().trim();
        const url = (row[3] || "").toString().trim();
        if (!url || !url.startsWith("http")) continue;
        entries.push({
          commune: currentCommune, type, url, dateMaj,
          dateControle: (row[4] || "").toString().trim(),
          modifications: (row[5] || "").toString().trim(),
          dateContact: (row[6] || "").toString().trim(),
          reponse: (row[7] || "").toString().trim(),
          contactEmail: (row[8] || "").toString().trim(),
          contactNotes: (row[9] || "").toString().trim(),
        });
      }

      const uniqueCommunes = [...new Set(entries.map(e => e.commune))];
      for (const nom of uniqueCommunes) {
        if (!communes.find(c => c.nom === nom)) {
          await supabase.from("linking_communes").insert({ nom });
        }
      }

      const { data: allCommunes } = await supabase.from("linking_communes").select("*");
      const communeMap = Object.fromEntries((allCommunes || []).map((c: any) => [c.nom, c.id]));

      let inserted = 0;
      for (const entry of entries) {
        const commune_id = communeMap[entry.commune];
        if (!commune_id) continue;
        const { data: existing } = await supabase.from("linking_sites").select("id").eq("commune_id", commune_id).eq("url", entry.url).maybeSingle();
        if (!existing) {
          const statut = entry.modifications && entry.modifications !== "X" && entry.modifications !== "OK" ? "a_modifier" : entry.modifications === "OK" ? "ok" : "en_attente";
          await supabase.from("linking_sites").insert({
            commune_id, type_contenu: entry.type || null, url: entry.url, date_mise_a_jour: entry.dateMaj || null,
            statut, modifications: entry.modifications && entry.modifications !== "X" ? entry.modifications : null,
            contact_email: entry.contactEmail || null, contact_notes: entry.contactNotes || null, reponse: entry.reponse || null,
          });
          inserted++;
        }
      }

      toast({ title: "Import terminé", description: `${inserted} sites importés pour ${uniqueCommunes.length} communes.` });
      fetchData();
    } catch (err) {
      console.error("Import error:", err);
      toast({ title: "Erreur", description: "Erreur lors de l'import", variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // Single site check — updates local state without refetching everything
  const handleCheckSite = async (site: SiteWithCommune) => {
    setCheckingIds(prev => new Set([...prev, site.id]));
    try {
      const { data, error } = await supabase.functions.invoke("check-linking-site", {
        body: { url: site.url, commune: site.commune_nom, type_contenu: site.type_contenu, current_info: site.modifications },
      });
      if (error) throw error;

      const newStatut = data.is_up_to_date ? "ok" : "a_modifier";
      const issuesText = data.issues?.length
        ? data.issues.join("\n• ")
        : (!data.is_up_to_date ? "Des informations semblent obsolètes ou incorrectes (détails non précisés par l'IA)." : null);
      const updates = {
        last_scrape_result: data,
        last_scraped_at: new Date().toISOString(),
        date_dernier_controle: new Date().toISOString().split("T")[0],
        statut: newStatut,
        modifications: newStatut === "a_modifier" ? (issuesText ? `• ${issuesText}` : "Vérification manuelle nécessaire.") : null,
      };

      await supabase.from("linking_sites").update(updates).eq("id", site.id);

      // Update local state instead of refetching
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, ...updates } : s));

      if (!bulkChecking) {
        toast({
          title: data.is_up_to_date ? "✅ Site à jour" : "⚠️ Modifications détectées",
          description: data.issues?.length ? data.issues.slice(0, 2).join(", ") : "Aucun problème détecté",
        });
      }
    } catch (err) {
      console.error("Check error:", err);
      if (!bulkChecking) {
        toast({ title: "Erreur", description: "Erreur lors de la vérification", variant: "destructive" });
      }
    } finally {
      setCheckingIds(prev => { const n = new Set(prev); n.delete(site.id); return n; });
    }
  };

  const handleCheckAll = async () => {
    const toCheck = filteredSites.filter(s => s.statut !== "ok" || !s.last_scraped_at);
    if (toCheck.length === 0) {
      toast({ title: "Rien à vérifier", description: "Tous les sites filtrés sont déjà OK." });
      return;
    }

    setBulkChecking(true);
    bulkAbortRef.current = false;
    setBulkProgress({ current: 0, total: toCheck.length, currentSite: "" });

    let okCount = 0, issueCount = 0, errorCount = 0;

    for (let i = 0; i < toCheck.length; i++) {
      if (bulkAbortRef.current) break;
      const site = toCheck[i];
      setBulkProgress({ current: i + 1, total: toCheck.length, currentSite: `${site.commune_nom} — ${site.type_contenu || new URL(site.url).hostname}` });

      try {
        await handleCheckSite(site);
        // Check updated state
        const updated = sites.find(s => s.id === site.id);
        if (updated?.statut === "ok") okCount++; else issueCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkChecking(false);
    toast({
      title: bulkAbortRef.current ? "Vérification interrompue" : "Vérification terminée",
      description: `${okCount} OK, ${issueCount} à modifier, ${errorCount} erreurs`,
    });
    fetchData(); // Final refresh to sync state
  };

  const handleSendEmail = async (site: SiteWithCommune) => {
    setSendingIds(prev => new Set([...prev, site.id]));
    try {
      const suggestedEmail = site.last_scrape_result?.suggested_email || `Bonjour,\n\nNous avons remarqué que les informations concernant la commune de ${site.commune_nom} sur votre page ${site.url} nécessitent une mise à jour.\n\nModifications à apporter :\n${site.modifications || "Veuillez vérifier les informations."}\n\nCordialement,\nDLVA Tourisme`;

      const { error } = await supabase.functions.invoke("send-linking-email", {
        body: { commune: site.commune_nom, url: site.url, type_contenu: site.type_contenu, contact_email: site.contact_email, modifications: site.modifications, suggested_email: suggestedEmail },
      });
      if (error) throw error;

      await supabase.from("linking_sites").update({ date_contact: new Date().toISOString().split("T")[0] }).eq("id", site.id);
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, date_contact: new Date().toISOString().split("T")[0] } : s));
      toast({ title: "Mail envoyé", description: `Webhook déclenché pour ${site.commune_nom}` });
    } catch (err) {
      console.error("Send error:", err);
      toast({ title: "Erreur", description: "Erreur lors de l'envoi", variant: "destructive" });
    } finally {
      setSendingIds(prev => { const n = new Set(prev); n.delete(site.id); return n; });
    }
  };

  const handleAddSite = async () => {
    if (!newCommune || !newUrl) return;
    try {
      let communeId: string;
      const existing = communes.find(c => c.nom.toLowerCase() === newCommune.toLowerCase());
      if (existing) { communeId = existing.id; }
      else {
        const { data, error } = await supabase.from("linking_communes").insert({ nom: newCommune }).select("id").single();
        if (error) throw error;
        communeId = data.id;
      }
      await supabase.from("linking_sites").insert({ commune_id: communeId, url: newUrl, type_contenu: newType || null, contact_email: newEmail || null, statut: "en_attente" });
      toast({ title: "Site ajouté" });
      setShowAddDialog(false);
      setNewCommune(""); setNewUrl(""); setNewType(""); setNewEmail("");
      fetchData();
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l'ajout", variant: "destructive" });
    }
  };

  const handleUpdateSite = async () => {
    if (!editSite) return;
    try {
      await supabase.from("linking_sites").update({
        type_contenu: editSite.type_contenu, url: editSite.url, statut: editSite.statut,
        modifications: editSite.modifications, contact_email: editSite.contact_email,
        contact_notes: editSite.contact_notes, reponse: editSite.reponse,
      }).eq("id", editSite.id);
      toast({ title: "Site mis à jour" });
      setShowEditDialog(false);
      fetchData();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm("Supprimer ce site ?")) return;
    await supabase.from("linking_sites").delete().eq("id", id);
    setSites(prev => prev.filter(s => s.id !== id));
    toast({ title: "Site supprimé" });
  };

  const getHostname = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <>
      <Seo title="Linking - Suivi par commune" description="Suivi du linking par commune" />
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Linking</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Suivi des sites web par commune</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />Ajouter
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild disabled={importing}>
                <span><Upload className="w-4 h-4 mr-1" />{importing ? "Import..." : "Excel"}</span>
              </Button>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <Button variant="outline" size="sm" onClick={handleCheckAll} disabled={bulkChecking || checkingIds.size > 0}>
              <RefreshCw className={`w-4 h-4 mr-1 ${bulkChecking ? "animate-spin" : ""}`} />
              {bulkChecking ? "En cours..." : "Vérifier tout"}
            </Button>
          </div>
        </div>

        {/* How it works */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2"><Info className="w-4 h-4" />Comment fonctionne le système Linking ?</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="border-muted bg-muted/30">
              <CardContent className="pt-4 space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Le module Linking permet de vérifier automatiquement que les sites web des communes affichent des informations touristiques à jour.</p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">📋 Étape 1 : Import des sites</p>
                  <p>Importez vos sites via un fichier Excel (colonnes : Commune, Type de contenu, URL, Date de mise à jour) ou ajoutez-les manuellement avec le bouton "Ajouter".</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">🔍 Étape 2 : Vérification automatique</p>
                  <p>Cliquez sur "Vérifier tout" ou sur l'icône 🔄 d'un site individuel. Le système utilise <strong>Firecrawl</strong> pour scrapper le contenu de chaque page web, puis une <strong>IA</strong> analyse si les informations touristiques présentes sont correctes et à jour.</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">📊 Étape 3 : Résultat de l'analyse</p>
                  <p>Chaque site reçoit un statut :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong className="text-primary">OK</strong> — Les informations sont à jour, rien à signaler.</li>
                    <li><strong className="text-destructive">À modifier</strong> — Des erreurs ou informations obsolètes ont été détectées. Les modifications suggérées sont enregistrées.</li>
                    <li><strong>En attente</strong> — Le site n'a pas encore été vérifié.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">✉️ Étape 4 : Envoi du mail de correction</p>
                  <p>Pour les sites "À modifier", cliquez sur l'icône ✉️ pour envoyer un mail pré-écrit (via un webhook Make) demandant au responsable du site de mettre à jour les informations erronées. L'email contient automatiquement les modifications détectées.</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">🔄 Vérification automatique</p>
                  <p>Un webhook Make peut déclencher la vérification de tous les sites en arrière-plan, sans avoir besoin d'ouvrir l'application. Configurez un scénario Make pointant vers la fonction <code className="bg-muted px-1 rounded text-xs">trigger-linking-check</code>.</p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>


        {bulkChecking && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    Vérification en cours ({bulkProgress.current}/{bulkProgress.total})
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { bulkAbortRef.current = true; }}>
                  <X className="w-4 h-4 mr-1" />Arrêter
                </Button>
              </div>
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground truncate">
                {bulkProgress.currentSite}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterCommune} onValueChange={setFilterCommune}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Toutes les communes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les communes</SelectItem>
              {communes.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="a_modifier">À modifier</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-xl md:text-2xl font-bold">{communes.length}</div><p className="text-xs text-muted-foreground">Communes</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-xl md:text-2xl font-bold">{sites.length}</div><p className="text-xs text-muted-foreground">Sites</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-xl md:text-2xl font-bold text-primary">{sites.filter(s => s.statut === "ok").length}</div><p className="text-xs text-muted-foreground">OK</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-xl md:text-2xl font-bold text-destructive">{sites.filter(s => s.statut === "a_modifier").length}</div><p className="text-xs text-muted-foreground">À modifier</p></CardContent></Card>
        </div>

        {/* Sites list - card layout for better readability */}
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : filteredSites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Aucun site trouvé</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filteredSites.length} site{filteredSites.length > 1 ? "s" : ""} affiché{filteredSites.length > 1 ? "s" : ""}</p>
            <div className="grid gap-3">
              {filteredSites.map(site => {
                const sc = statusConfig[site.statut] || statusConfig.en_attente;
                const StatusIcon = sc.icon;
                const isChecking = checkingIds.has(site.id);
                const isSending = sendingIds.has(site.id);

                return (
                  <Card key={site.id} className={`transition-opacity ${isChecking ? "opacity-70" : ""}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        {/* Main info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{site.commune_nom}</span>
                            {site.type_contenu && (
                              <Badge variant="outline" className="text-xs">{site.type_contenu}</Badge>
                            )}
                            <Badge variant={sc.variant} className="text-xs">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {sc.label}
                            </Badge>
                            {isChecking && (
                              <Badge variant="outline" className="text-xs animate-pulse">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Vérification...
                              </Badge>
                            )}
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            {getHostname(site.url)}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {site.statut === "a_modifier" && site.modifications && (
                            <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                              <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                                <AlertTriangle className="w-3 h-3" /> Modifications à apporter :
                              </p>
                              <p className="text-xs text-destructive/90 whitespace-pre-line">{site.modifications}</p>
                            </div>
                          )}
                          {site.date_dernier_controle && (
                            <p className="text-xs text-muted-foreground">Dernier contrôle : {site.date_dernier_controle}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Vérifier" disabled={isChecking} onClick={() => handleCheckSite(site)}>
                            {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>
                          {site.statut === "a_modifier" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Envoyer mail" disabled={isSending} onClick={() => handleSendEmail(site)}>
                              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Détails" onClick={() => { setSelectedSite(site); setShowDetailDialog(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Modifier" onClick={() => { setEditSite({ ...site }); setShowEditDialog(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Supprimer" onClick={() => handleDeleteSite(site.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSite?.commune_nom} — {selectedSite?.type_contenu || "Site"}</DialogTitle>
            </DialogHeader>
            {selectedSite && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-xs">URL</span>
                    <div><a href={selectedSite.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{selectedSite.url}</a></div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Statut</span>
                    <div><Badge variant={statusConfig[selectedSite.statut]?.variant}>{statusConfig[selectedSite.statut]?.label}</Badge></div>
                  </div>
                  {selectedSite.contact_email && <div><span className="text-muted-foreground text-xs">Contact</span><div>{selectedSite.contact_email}</div></div>}
                  {selectedSite.date_dernier_controle && <div><span className="text-muted-foreground text-xs">Dernier contrôle</span><div>{selectedSite.date_dernier_controle}</div></div>}
                  {selectedSite.date_contact && <div><span className="text-muted-foreground text-xs">Date contact</span><div>{selectedSite.date_contact}</div></div>}
                  {selectedSite.reponse && <div><span className="text-muted-foreground text-xs">Réponse</span><div>{selectedSite.reponse}</div></div>}
                </div>
                {selectedSite.modifications && (
                  <div>
                    <span className="text-muted-foreground text-xs">Modifications</span>
                    <p className="mt-1">{selectedSite.modifications}</p>
                  </div>
                )}
                {selectedSite.contact_notes && (
                  <div>
                    <span className="text-muted-foreground text-xs">Notes</span>
                    <p className="mt-1">{selectedSite.contact_notes}</p>
                  </div>
                )}
                {selectedSite.last_scrape_result && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Résultat du scraping</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">À jour :</span>
                        {selectedSite.last_scrape_result.is_up_to_date ? <Badge variant="default">✅ Oui</Badge> : <Badge variant="destructive">❌ Non</Badge>}
                      </div>
                      {selectedSite.last_scrape_result.issues?.length > 0 && (
                        <div>
                          <span className="font-medium">Problèmes :</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {selectedSite.last_scrape_result.issues.map((issue: string, i: number) => (
                              <li key={i} className="text-sm text-destructive/80">{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedSite.last_scrape_result.suggested_email && (
                        <div>
                          <span className="font-medium">Mail suggéré :</span>
                          <pre className="mt-1 p-3 bg-muted rounded text-xs whitespace-pre-wrap">{selectedSite.last_scrape_result.suggested_email}</pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un site</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Commune</label>
                <Input value={newCommune} onChange={e => setNewCommune(e.target.value)} placeholder="Nom de la commune" list="communes-list" />
                <datalist id="communes-list">{communes.map(c => <option key={c.id} value={c.nom} />)}</datalist>
              </div>
              <div><label className="text-sm font-medium">URL</label><Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." /></div>
              <div><label className="text-sm font-medium">Type de contenu</label><Input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Wikipedia, Site Mairie, etc." /></div>
              <div><label className="text-sm font-medium">Email de contact</label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="contact@..." /></div>
              <Button onClick={handleAddSite} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier le site</DialogTitle></DialogHeader>
            {editSite && (
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Type de contenu</label><Input value={editSite.type_contenu || ""} onChange={e => setEditSite({ ...editSite, type_contenu: e.target.value })} /></div>
                <div><label className="text-sm font-medium">URL</label><Input value={editSite.url} onChange={e => setEditSite({ ...editSite, url: e.target.value })} /></div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={editSite.statut} onValueChange={v => setEditSite({ ...editSite, statut: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ok">OK</SelectItem>
                      <SelectItem value="a_modifier">À modifier</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Modifications</label><Textarea value={editSite.modifications || ""} onChange={e => setEditSite({ ...editSite, modifications: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Email de contact</label><Input value={editSite.contact_email || ""} onChange={e => setEditSite({ ...editSite, contact_email: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Réponse</label><Input value={editSite.reponse || ""} onChange={e => setEditSite({ ...editSite, reponse: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Notes contact</label><Textarea value={editSite.contact_notes || ""} onChange={e => setEditSite({ ...editSite, contact_notes: e.target.value })} /></div>
                <Button onClick={handleUpdateSite} className="w-full">Enregistrer</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
