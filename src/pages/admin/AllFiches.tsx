import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { ArrowLeft, Loader2, RefreshCw, Search, Eye, CheckCircle, XCircle, Upload, ShieldCheck, AlertTriangle, EyeOff, Calendar, Radar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FicheDetailsDialog } from "@/components/fiches/FicheDetailsDialog";

import type { Json } from "@/integrations/supabase/types";
import { isAfter, parseISO } from "date-fns";

interface FicheData {
  id: string;
  fiche_type: string;
  fiche_id: string;
  source: string;
  synced_to_sheets: boolean;
  created_at: string;
  updated_at: string;
  data: Json;
  is_published: boolean;
  hidden_reason: string | null;
  last_verified_at: string | null;
  verification_status: string | null;
}

type PublishFilter = "all" | "published" | "hidden" | "expired" | "verified";

export default function AllFiches() {
  const [fiches, setFiches] = useState<FicheData[]>([]);
  const [filteredFiches, setFilteredFiches] = useState<FicheData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("published");
  const [selectedFiche, setSelectedFiche] = useState<FicheData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [alertsCount, setAlertsCount] = useState(0);
  const unsyncedCount = fiches.filter(f => !f.synced_to_sheets).length;

  // Load pending alerts count
  const loadAlertsCount = async () => {
    const { count } = await supabase
      .from('verification_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setAlertsCount(count || 0);
  };

  const verifySync = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sheets-sync', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Vérification terminée",
        description: data.message || `${data.results?.unmarked || 0} fiches à resynchroniser`,
      });

      // Reload fiches to update sync status
      await loadAllFiches();
    } catch (error: unknown) {
      console.error('Erreur lors de la vérification:', error);
      toast({
        title: "Erreur de vérification",
        description: "Impossible de vérifier la synchronisation",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const loadAllFiches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiches_data')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setFiches(data || []);
      setFilteredFiches(data || []);
      toast({
        title: "Fiches chargées",
        description: `${data?.length || 0} fiches trouvées`,
      });
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des fiches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fiches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncToSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Synchronisation terminée",
        description: data.message || `${data.results?.synced || 0} fiches synchronisées`,
      });

      // Reload fiches to update sync status
      await loadAllFiches();
    } catch (error: unknown) {
      console.error('Erreur lors de la synchronisation:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser vers Google Sheets",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Check if fiche opening period has expired
  const isOpeningExpired = (data: Json): boolean => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const obj = data as Record<string, unknown>;
    const ouverture = obj.ouverture as Record<string, unknown> | undefined;
    if (!ouverture) return false;
    
    const periodesOuvertures = ouverture.periodesOuvertures as Array<Record<string, unknown>> | undefined;
    if (!periodesOuvertures || periodesOuvertures.length === 0) return false;
    
    const today = new Date();
    
    // Check if all periods have expired
    const hasValidPeriod = periodesOuvertures.some(periode => {
      const dateFin = periode.dateFin as string | undefined;
      if (!dateFin) return true; // No end date = still valid
      
      const tousLesAns = periode.tousLesAns as boolean;
      if (tousLesAns) return true; // Recurring yearly = still valid
      
      try {
        const endDate = parseISO(dateFin);
        return isAfter(endDate, today) || endDate.toDateString() === today.toDateString();
      } catch {
        return true;
      }
    });
    
    return !hasValidPeriod;
  };

  // Extract opening period dates
  const extractPeriodeDates = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const ouverture = obj.ouverture as Record<string, unknown> | undefined;
    if (!ouverture) return "-";
    
    const periodesOuvertures = ouverture.periodesOuvertures as Array<Record<string, unknown>> | undefined;
    if (!periodesOuvertures || periodesOuvertures.length === 0) return "-";
    
    const premiere = periodesOuvertures[0];
    const dateDebut = premiere.dateDebut as string | undefined;
    const dateFin = premiere.dateFin as string | undefined;
    const tousLesAns = premiere.tousLesAns as boolean;
    
    if (tousLesAns) return "Toute l'année";
    if (dateDebut && dateFin) {
      return `${format(parseISO(dateDebut), "dd/MM/yyyy")} - ${format(parseISO(dateFin), "dd/MM/yyyy")}`;
    }
    return "-";
  };

  // Toggle publish status
  const togglePublish = async (fiche: FicheData) => {
    setTogglingPublish(fiche.id);
    try {
      const newStatus = !fiche.is_published;
      const { error } = await supabase
        .from('fiches_data')
        .update({ 
          is_published: newStatus,
          hidden_reason: newStatus ? null : 'Masqué manuellement'
        })
        .eq('id', fiche.id);

      if (error) throw error;

      toast({
        title: newStatus ? "Fiche publiée" : "Fiche masquée",
        description: `La fiche sera ${newStatus ? 'synchronisée' : 'marquée pour synchronisation'}`,
      });

      await loadAllFiches();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut de la fiche",
        variant: "destructive",
      });
    } finally {
      setTogglingPublish(null);
    }
  };

  useEffect(() => {
    loadAllFiches();
    loadAlertsCount();
  }, []);

  useEffect(() => {
    let result = fiches;

    // Filter by publish status
    // Only FMA (Fête et manifestation) fiches should be considered expired
    const isFMAExpired = (fiche: FicheData) => 
      fiche.fiche_type === "FETE_ET_MANIFESTATION" && isOpeningExpired(fiche.data);
    
    if (publishFilter === "published") {
      result = result.filter(f => f.is_published && !isFMAExpired(f));
    } else if (publishFilter === "hidden") {
      result = result.filter(f => !f.is_published);
    } else if (publishFilter === "expired") {
      // Only show FMA fiches in the expired filter
      result = result.filter(f => isFMAExpired(f));
    } else if (publishFilter === "verified") {
      result = result.filter(f => f.last_verified_at !== null);
    }

    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter(f => f.fiche_type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(f => {
        const nom = extractNom(f.data);
        const commune = extractCommune(f.data);
        return (
          nom.toLowerCase().includes(search) ||
          commune.toLowerCase().includes(search) ||
          f.fiche_id.includes(search)
        );
      });
    }

    setFilteredFiches(result);
  }, [fiches, typeFilter, searchTerm, publishFilter]);

  // Extract name from APIDAE data structure
  const extractNom = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const nom = obj.nom as Record<string, unknown> | undefined;
    if (nom?.libelleFr) return nom.libelleFr as string;
    if (typeof nom === 'string') return nom;
    return "-";
  };

  // Extract commune from APIDAE data structure
  const extractCommune = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const localisation = obj.localisation as Record<string, unknown> | undefined;
    const adresse = localisation?.adresse as Record<string, unknown> | undefined;
    const commune = adresse?.commune as Record<string, unknown> | undefined;
    return (commune?.nom as string) || "-";
  };

  // Extract contact info from APIDAE data structure
  const extractContact = (data: Json, type: string): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const informations = obj.informations as Record<string, unknown> | undefined;
    const moyens = informations?.moyensCommunication as Array<Record<string, unknown>> | undefined;
    if (!moyens) return "-";
    
    const moyen = moyens.find(m => {
      const moyenType = m.type as Record<string, unknown> | undefined;
      return moyenType?.libelleFr === type;
    });
    
    if (moyen) {
      const coordonnees = moyen.coordonnees as Record<string, string> | undefined;
      return coordonnees?.fr || (moyen.coordonnees as string) || "-";
    }
    return "-";
  };

  // Get unique fiche types for filter
  const ficheTypes = [...new Set(fiches.map(f => f.fiche_type))].sort();

  return (
    <>
      <Seo 
        title="Fiches synchronisées - Administration"
        description="Gestion des fiches APIDAE synchronisées"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tableau de bord
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Fiches synchronisées</h1>
                <p className="text-sm text-muted-foreground">
                  Données reçues via Make/APIDAE
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/admin/verification-alerts")}
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alertes
                {alertsCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {alertsCount}
                  </Badge>
                )}
              </Button>
              <Button 
                onClick={verifySync} 
                variant="outline" 
                size="sm"
                disabled={verifying || fiches.filter(f => f.synced_to_sheets).length === 0}
                title="Vérifie si des fiches ont été supprimées du Google Sheet"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Vérifier
              </Button>
              <Button 
                onClick={syncToSheets} 
                variant="default" 
                size="sm"
                disabled={syncing || unsyncedCount === 0}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Sync Sheets
                {unsyncedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unsyncedCount}
                  </Badge>
                )}
              </Button>
              <Button 
                onClick={loadAllFiches} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Actualiser
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, commune ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={publishFilter} onValueChange={(v) => setPublishFilter(v as PublishFilter)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les fiches</SelectItem>
                <SelectItem value="published">
                  <span className="flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Publiées
                  </span>
                </SelectItem>
                <SelectItem value="hidden">
                  <span className="flex items-center gap-2">
                    <EyeOff className="w-3 h-3" /> Masquées
                  </span>
                </SelectItem>
                <SelectItem value="expired">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Période expirée
                  </span>
                </SelectItem>
                <SelectItem value="verified">
                  <span className="flex items-center gap-2">
                    <Radar className="w-3 h-3" /> Vérifiées (Firecrawl)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {ficheTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fiches Display */}
          <Card>
            <CardHeader>
              <CardTitle>
                {loading ? "Chargement..." : `${filteredFiches.length} fiche(s)`}
              </CardTitle>
              <CardDescription>
                {filteredFiches.length !== fiches.length && 
                  `(${fiches.length} au total)`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement des fiches...</span>
                </div>
              ) : filteredFiches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {fiches.length === 0 ? "Aucune fiche trouvée" : "Aucun résultat pour cette recherche"}
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Commune</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-center">Sync</TableHead>
                        <TableHead className="text-center">Vérifié</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiches.map((fiche) => {
                        const expired = isOpeningExpired(fiche.data);
                        return (
                        <TableRow key={fiche.id} className={expired ? "opacity-60" : ""}>
                          <TableCell>
                            {expired ? (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                Expiré
                              </Badge>
                            ) : fiche.is_published ? (
                              <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
                                <Eye className="w-3 h-3 mr-1" />
                                Publié
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Masqué
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {fiche.fiche_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {fiche.fiche_id}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {extractNom(fiche.data)}
                          </TableCell>
                          <TableCell>
                            {extractCommune(fiche.data)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {extractPeriodeDates(fiche.data)}
                          </TableCell>
                          <TableCell className="text-center">
                            {fiche.synced_to_sheets ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {fiche.last_verified_at ? (
                              <div className="flex flex-col items-center">
                                <Radar className="w-4 h-4 text-blue-500" />
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(fiche.last_verified_at), "dd/MM", { locale: fr })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePublish(fiche)}
                                disabled={togglingPublish === fiche.id}
                                title={fiche.is_published ? "Masquer" : "Publier"}
                              >
                                {togglingPublish === fiche.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : fiche.is_published ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFiche(fiche)}
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Dialog */}
      <FicheDetailsDialog 
        open={!!selectedFiche} 
        onOpenChange={() => setSelectedFiche(null)}
        fiche={selectedFiche}
      />
    </>
  );
}
