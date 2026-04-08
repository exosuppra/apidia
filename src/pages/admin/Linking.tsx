import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, RefreshCw, Mail, Plus, ExternalLink, Check, AlertTriangle, Clock, Loader2, Edit2, Trash2 } from "lucide-react";
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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "default" },
  a_modifier: { label: "À modifier", variant: "destructive" },
  en_attente: { label: "En attente", variant: "secondary" },
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

      // Parse the Excel structure: commune in col A (merged), type in col B, etc.
      let currentCommune = "";
      const entries: { commune: string; type: string; url: string; dateMaj: string; dateControle: string; modifications: string; dateContact: string; reponse: string; contactEmail: string; contactNotes: string }[] = [];

      for (let i = 2; i < rows.length; i++) { // skip header rows
        const row = rows[i];
        if (!row || row.length < 4) continue;

        const communeVal = (row[0] || "").toString().trim();
        if (communeVal) currentCommune = communeVal;
        if (!currentCommune) continue;

        const type = (row[1] || "").toString().trim();
        const dateMaj = (row[2] || "").toString().trim();
        const url = (row[3] || "").toString().trim();
        if (!url || !url.startsWith("http")) continue;

        const dateControle = (row[4] || "").toString().trim();
        const modifications = (row[5] || "").toString().trim();
        const dateContact = (row[6] || "").toString().trim();
        const reponse = (row[7] || "").toString().trim();
        const contactEmail = (row[8] || "").toString().trim();
        const contactNotes = (row[9] || "").toString().trim();

        entries.push({ commune: currentCommune, type, url, dateMaj, dateControle, modifications, dateContact, reponse, contactEmail, contactNotes });
      }

      // Upsert communes
      const uniqueCommunes = [...new Set(entries.map(e => e.commune))];
      for (const nom of uniqueCommunes) {
        const existing = communes.find(c => c.nom === nom);
        if (!existing) {
          await supabase.from("linking_communes").insert({ nom });
        }
      }

      // Re-fetch communes to get IDs
      const { data: allCommunes } = await supabase.from("linking_communes").select("*");
      const communeMap = Object.fromEntries((allCommunes || []).map((c: any) => [c.nom, c.id]));

      // Insert sites (skip duplicates by URL + commune)
      let inserted = 0;
      for (const entry of entries) {
        const commune_id = communeMap[entry.commune];
        if (!commune_id) continue;

        const { data: existing } = await supabase
          .from("linking_sites")
          .select("id")
          .eq("commune_id", commune_id)
          .eq("url", entry.url)
          .maybeSingle();

        if (!existing) {
          const statut = entry.modifications && entry.modifications !== "X" && entry.modifications !== "OK" ? "a_modifier" : entry.modifications === "OK" ? "ok" : "en_attente";
          await supabase.from("linking_sites").insert({
            commune_id,
            type_contenu: entry.type || null,
            url: entry.url,
            date_mise_a_jour: entry.dateMaj || null,
            statut,
            modifications: entry.modifications && entry.modifications !== "X" ? entry.modifications : null,
            contact_email: entry.contactEmail || null,
            contact_notes: entry.contactNotes || null,
            reponse: entry.reponse || null,
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

  const handleCheckSite = async (site: SiteWithCommune) => {
    setCheckingIds(prev => new Set([...prev, site.id]));
    try {
      const { data, error } = await supabase.functions.invoke("check-linking-site", {
        body: {
          url: site.url,
          commune: site.commune_nom,
          type_contenu: site.type_contenu,
          current_info: site.modifications,
        },
      });

      if (error) throw error;

      const newStatut = data.is_up_to_date ? "ok" : "a_modifier";
      await supabase.from("linking_sites").update({
        last_scrape_result: data,
        last_scraped_at: new Date().toISOString(),
        date_dernier_controle: new Date().toISOString().split("T")[0],
        statut: newStatut,
        modifications: data.issues?.length ? data.issues.join("; ") : site.modifications,
      }).eq("id", site.id);

      toast({
        title: data.is_up_to_date ? "✅ Site à jour" : "⚠️ Modifications détectées",
        description: data.issues?.length ? data.issues.join(", ") : "Aucun problème détecté",
      });
      fetchData();
    } catch (err) {
      console.error("Check error:", err);
      toast({ title: "Erreur", description: "Erreur lors de la vérification", variant: "destructive" });
    } finally {
      setCheckingIds(prev => { const n = new Set(prev); n.delete(site.id); return n; });
    }
  };

  const handleSendEmail = async (site: SiteWithCommune) => {
    setSendingIds(prev => new Set([...prev, site.id]));
    try {
      const suggestedEmail = site.last_scrape_result?.suggested_email || `Bonjour,\n\nNous avons remarqué que les informations concernant la commune de ${site.commune_nom} sur votre page ${site.url} nécessitent une mise à jour.\n\nModifications à apporter :\n${site.modifications || "Veuillez vérifier les informations."}\n\nCordialement,\nDLVA Tourisme`;

      const { error } = await supabase.functions.invoke("send-linking-email", {
        body: {
          commune: site.commune_nom,
          url: site.url,
          type_contenu: site.type_contenu,
          contact_email: site.contact_email,
          modifications: site.modifications,
          suggested_email: suggestedEmail,
        },
      });

      if (error) throw error;

      await supabase.from("linking_sites").update({
        date_contact: new Date().toISOString().split("T")[0],
      }).eq("id", site.id);

      toast({ title: "Mail envoyé", description: `Webhook déclenché pour ${site.commune_nom} - ${site.type_contenu}` });
      fetchData();
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
      // Find or create commune
      let communeId: string;
      const existing = communes.find(c => c.nom.toLowerCase() === newCommune.toLowerCase());
      if (existing) {
        communeId = existing.id;
      } else {
        const { data, error } = await supabase.from("linking_communes").insert({ nom: newCommune }).select("id").single();
        if (error) throw error;
        communeId = data.id;
      }

      await supabase.from("linking_sites").insert({
        commune_id: communeId,
        url: newUrl,
        type_contenu: newType || null,
        contact_email: newEmail || null,
        statut: "en_attente",
      });

      toast({ title: "Site ajouté" });
      setShowAddDialog(false);
      setNewCommune("");
      setNewUrl("");
      setNewType("");
      setNewEmail("");
      fetchData();
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur lors de l'ajout", variant: "destructive" });
    }
  };

  const handleUpdateSite = async () => {
    if (!editSite) return;
    try {
      await supabase.from("linking_sites").update({
        type_contenu: editSite.type_contenu,
        url: editSite.url,
        statut: editSite.statut,
        modifications: editSite.modifications,
        contact_email: editSite.contact_email,
        contact_notes: editSite.contact_notes,
        reponse: editSite.reponse,
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
    toast({ title: "Site supprimé" });
    fetchData();
  };

  const handleCheckAll = async () => {
    for (const site of filteredSites) {
      await handleCheckSite(site);
    }
  };

  return (
    <>
      <Seo title="Linking - Suivi par commune" description="Suivi du linking par commune" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Linking</h1>
            <p className="text-muted-foreground">Suivi des sites web par commune</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />Ajouter
            </Button>
            <label>
              <Button variant="outline" asChild disabled={importing}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />{importing ? "Import..." : "Importer Excel"}
                </span>
              </Button>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <Button variant="outline" onClick={handleCheckAll} disabled={checkingIds.size > 0}>
              <RefreshCw className="w-4 h-4 mr-2" />Vérifier tout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="w-64">
            <Select value={filterCommune} onValueChange={setFilterCommune}>
              <SelectTrigger><SelectValue placeholder="Toutes les communes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les communes</SelectItem>
                {communes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="a_modifier">À modifier</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{communes.length}</div><p className="text-xs text-muted-foreground">Communes</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{sites.length}</div><p className="text-xs text-muted-foreground">Sites</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">{sites.filter(s => s.statut === "ok").length}</div><p className="text-xs text-muted-foreground">OK</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-destructive">{sites.filter(s => s.statut === "a_modifier").length}</div><p className="text-xs text-muted-foreground">À modifier</p></CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commune</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Dernier contrôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Modifications</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredSites.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun site trouvé</TableCell></TableRow>
                  ) : (
                    filteredSites.map(site => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.commune_nom}</TableCell>
                        <TableCell>{site.type_contenu || "-"}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate">
                            {new URL(site.url).hostname} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell>{site.date_dernier_controle || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[site.statut]?.variant || "secondary"}>
                            {site.statut === "ok" && <Check className="w-3 h-3 mr-1" />}
                            {site.statut === "a_modifier" && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {site.statut === "en_attente" && <Clock className="w-3 h-3 mr-1" />}
                            {statusConfig[site.statut]?.label || site.statut}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{site.modifications || "-"}</TableCell>
                        <TableCell>{site.contact_email || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Vérifier"
                              disabled={checkingIds.has(site.id)}
                              onClick={() => handleCheckSite(site)}
                            >
                              {checkingIds.has(site.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Envoyer mail"
                              disabled={sendingIds.has(site.id)}
                              onClick={() => handleSendEmail(site)}
                            >
                              {sendingIds.has(site.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" title="Détails" onClick={() => { setSelectedSite(site); setShowDetailDialog(true); }}>
                              <Search className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Modifier" onClick={() => { setEditSite({ ...site }); setShowEditDialog(true); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDeleteSite(site.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSite?.commune_nom} - {selectedSite?.type_contenu}</DialogTitle>
            </DialogHeader>
            {selectedSite && (
              <div className="space-y-4">
                <div><strong>URL :</strong> <a href={selectedSite.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedSite.url}</a></div>
                <div><strong>Statut :</strong> <Badge variant={statusConfig[selectedSite.statut]?.variant}>{statusConfig[selectedSite.statut]?.label}</Badge></div>
                {selectedSite.modifications && <div><strong>Modifications :</strong> {selectedSite.modifications}</div>}
                {selectedSite.contact_email && <div><strong>Contact :</strong> {selectedSite.contact_email}</div>}
                {selectedSite.reponse && <div><strong>Réponse :</strong> {selectedSite.reponse}</div>}
                {selectedSite.contact_notes && <div><strong>Notes :</strong> {selectedSite.contact_notes}</div>}
                {selectedSite.last_scrape_result && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Résultat du dernier scraping</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div><strong>À jour :</strong> {selectedSite.last_scrape_result.is_up_to_date ? "✅ Oui" : "❌ Non"}</div>
                      {selectedSite.last_scrape_result.issues?.length > 0 && (
                        <div>
                          <strong>Problèmes :</strong>
                          <ul className="list-disc list-inside mt-1">
                            {selectedSite.last_scrape_result.issues.map((issue: string, i: number) => (
                              <li key={i} className="text-sm">{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedSite.last_scrape_result.suggested_email && (
                        <div>
                          <strong>Mail suggéré :</strong>
                          <pre className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">{selectedSite.last_scrape_result.suggested_email}</pre>
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
                <datalist id="communes-list">
                  {communes.map(c => <option key={c.id} value={c.nom} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Type de contenu</label>
                <Input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Wikipedia, Site Mairie, etc." />
              </div>
              <div>
                <label className="text-sm font-medium">Email de contact</label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="contact@..." />
              </div>
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
                <div>
                  <label className="text-sm font-medium">Type de contenu</label>
                  <Input value={editSite.type_contenu || ""} onChange={e => setEditSite({ ...editSite, type_contenu: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input value={editSite.url} onChange={e => setEditSite({ ...editSite, url: e.target.value })} />
                </div>
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
                <div>
                  <label className="text-sm font-medium">Modifications</label>
                  <Textarea value={editSite.modifications || ""} onChange={e => setEditSite({ ...editSite, modifications: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Email de contact</label>
                  <Input value={editSite.contact_email || ""} onChange={e => setEditSite({ ...editSite, contact_email: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Réponse</label>
                  <Input value={editSite.reponse || ""} onChange={e => setEditSite({ ...editSite, reponse: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes contact</label>
                  <Textarea value={editSite.contact_notes || ""} onChange={e => setEditSite({ ...editSite, contact_notes: e.target.value })} />
                </div>
                <Button onClick={handleUpdateSite} className="w-full">Enregistrer</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
