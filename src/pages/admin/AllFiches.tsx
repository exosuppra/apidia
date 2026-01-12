import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { 
  ArrowLeft, Loader2, RefreshCw, Search, Eye, CheckCircle, XCircle, 
  Upload, ShieldCheck, AlertTriangle, EyeOff, Calendar, Radar, FileUp, 
  ArrowRightLeft, CheckCheck, Database, Sparkles, HelpCircle, Trash2,
  ArrowLeftRight, Info
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FicheDetailsDialog } from "@/components/fiches/FicheDetailsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

interface FicheVerified {
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
  verified_at: string;
  verified_by: string | null;
  verification_status: string | null;
}

type PublishFilter = "all" | "published" | "hidden" | "expired" | "verified";

export default function AllFiches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "apidae";

  // APIDAE state
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
  const [transferring, setTransferring] = useState<string | null>(null);

  // Apidia state
  const [fichesApidia, setFichesApidia] = useState<FicheVerified[]>([]);
  const [filteredFichesApidia, setFilteredFichesApidia] = useState<FicheVerified[]>([]);
  const [loadingApidia, setLoadingApidia] = useState(true);
  const [searchTermApidia, setSearchTermApidia] = useState("");
  const [typeFilterApidia, setTypeFilterApidia] = useState<string>("all");
  const [transferringBack, setTransferringBack] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FicheVerified | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFicheApidia, setSelectedFicheApidia] = useState<FicheVerified | null>(null);

  // Counts
  const [alertsCount, setAlertsCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const unsyncedCount = fiches.filter(f => !f.synced_to_sheets).length;
  const publishedCount = fiches.filter(f => f.is_published).length;
  const hiddenCount = fiches.filter(f => !f.is_published).length;

  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper functions
  const extractNom = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const nom = obj.nom as Record<string, unknown> | undefined;
    if (nom?.libelleFr) return nom.libelleFr as string;
    if (typeof nom === 'string') return nom;
    return "-";
  };

  const extractCommune = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const localisation = obj.localisation as Record<string, unknown> | undefined;
    const adresse = localisation?.adresse as Record<string, unknown> | undefined;
    const commune = adresse?.commune as Record<string, unknown> | undefined;
    return (commune?.nom as string) || "-";
  };

  const isOpeningExpired = (data: Json): boolean => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const obj = data as Record<string, unknown>;
    const ouverture = obj.ouverture as Record<string, unknown> | undefined;
    if (!ouverture) return false;
    
    const periodesOuvertures = ouverture.periodesOuvertures as Array<Record<string, unknown>> | undefined;
    if (!periodesOuvertures || periodesOuvertures.length === 0) return false;
    
    const today = new Date();
    
    const hasValidPeriod = periodesOuvertures.some(periode => {
      const dateFin = periode.dateFin as string | undefined;
      if (!dateFin) return true;
      
      const tousLesAns = periode.tousLesAns as boolean;
      if (tousLesAns) return true;
      
      try {
        const endDate = parseISO(dateFin);
        return isAfter(endDate, today) || endDate.toDateString() === today.toDateString();
      } catch {
        return true;
      }
    });
    
    return !hasValidPeriod;
  };

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

  // Load counts
  const loadAlertsCount = async () => {
    const { count } = await supabase
      .from('verification_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setAlertsCount(count || 0);
  };

  const loadVerifiedCount = async () => {
    const { count } = await supabase
      .from('fiches_verified')
      .select('*', { count: 'exact', head: true });
    setVerifiedCount(count || 0);
  };

  // APIDAE functions
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

      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userData?.user?.id)
        .single();
      
      const actorName = profileData?.first_name && profileData?.last_name 
        ? `${profileData.first_name} ${profileData.last_name}`
        : userData?.user?.email || 'Admin';

      await supabase.functions.invoke('log-fiche-history', {
        body: {
          fiche_id: fiche.fiche_id,
          fiche_uuid: fiche.id,
          action_type: newStatus ? 'publish' : 'unpublish',
          actor_type: 'admin',
          actor_id: userData?.user?.id,
          actor_name: actorName,
          metadata: {
            previous_status: fiche.is_published,
            new_status: newStatus
          }
        }
      });

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

  const transferToVerified = async (fiche: FicheData) => {
    setTransferring(fiche.id);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('fiches_verified')
        .upsert({
          fiche_id: fiche.fiche_id,
          fiche_type: fiche.fiche_type,
          source: fiche.source,
          data: fiche.data,
          is_published: fiche.is_published,
          synced_to_sheets: false,
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: userData?.user?.id || null,
        }, { onConflict: 'fiche_id' });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('fiches_data')
        .delete()
        .eq('id', fiche.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Fiche transférée",
        description: "La fiche a été déplacée vers les fiches Apidia",
      });

      await loadAllFiches();
      await loadVerifiedCount();
      await loadFichesApidia();
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer la fiche",
        variant: "destructive",
      });
    } finally {
      setTransferring(null);
    }
  };

  // Apidia functions
  const loadFichesApidia = async () => {
    setLoadingApidia(true);
    try {
      const { data, error } = await supabase
        .from('fiches_verified')
        .select('*')
        .order('verified_at', { ascending: false });

      if (error) throw error;
      
      setFichesApidia(data || []);
      setFilteredFichesApidia(data || []);
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des fiches Apidia:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fiches Apidia",
        variant: "destructive",
      });
    } finally {
      setLoadingApidia(false);
    }
  };

  const transferBack = async (fiche: FicheVerified) => {
    setTransferringBack(fiche.id);
    try {
      const { error: insertError } = await supabase
        .from('fiches_data')
        .upsert({
          fiche_id: fiche.fiche_id,
          fiche_type: fiche.fiche_type,
          source: fiche.source,
          data: fiche.data,
          is_published: fiche.is_published,
          synced_to_sheets: false,
          verification_status: 'not_verified',
          last_verified_at: null,
        }, { onConflict: 'fiche_id' });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('fiches_verified')
        .delete()
        .eq('id', fiche.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Fiche transférée",
        description: "La fiche a été renvoyée vers les fiches APIDAE",
      });

      await loadFichesApidia();
      await loadAllFiches();
      await loadVerifiedCount();
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer la fiche",
        variant: "destructive",
      });
    } finally {
      setTransferringBack(null);
    }
  };

  const deleteFicheApidia = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('fiches_verified')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast({
        title: "Fiche supprimée",
        description: "La fiche a été supprimée définitivement",
      });

      setDeleteConfirm(null);
      await loadFichesApidia();
      await loadVerifiedCount();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la fiche",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Effects
  useEffect(() => {
    loadAllFiches();
    loadFichesApidia();
    loadAlertsCount();
    loadVerifiedCount();
  }, []);

  useEffect(() => {
    let result = fiches;

    const isFMAExpired = (fiche: FicheData) => 
      fiche.fiche_type === "FETE_ET_MANIFESTATION" && isOpeningExpired(fiche.data);
    
    if (publishFilter === "published") {
      result = result.filter(f => f.is_published && !isFMAExpired(f));
    } else if (publishFilter === "hidden") {
      result = result.filter(f => !f.is_published);
    } else if (publishFilter === "expired") {
      result = result.filter(f => isFMAExpired(f));
    } else if (publishFilter === "verified") {
      result = result.filter(f => f.last_verified_at !== null);
    }

    if (typeFilter !== "all") {
      result = result.filter(f => f.fiche_type === typeFilter);
    }

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

  useEffect(() => {
    let result = fichesApidia;

    if (typeFilterApidia !== "all") {
      result = result.filter(f => f.fiche_type === typeFilterApidia);
    }

    if (searchTermApidia) {
      const search = searchTermApidia.toLowerCase();
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

    setFilteredFichesApidia(result);
  }, [fichesApidia, typeFilterApidia, searchTermApidia]);

  const ficheTypes = [...new Set(fiches.map(f => f.fiche_type))].sort();
  const ficheTypesApidia = [...new Set(fichesApidia.map(f => f.fiche_type))].sort();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <>
      <Seo 
        title="Gestion des fiches - Administration"
        description="Gestion des fiches APIDAE et Apidia"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/admin/dashboard")} className="cursor-pointer hover:text-primary">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Gestion des fiches</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Gestion des fiches</h1>
                <p className="text-sm text-muted-foreground">
                  Gérez vos fiches APIDAE et Apidia
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="apidae" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Fiches APIDAE
                <Badge variant="secondary" className="ml-1 text-xs">
                  {fiches.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="apidia" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Fiches Apidia
                <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700">
                  {fichesApidia.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* APIDAE Tab */}
            <TabsContent value="apidae" className="space-y-6">
              {/* Description */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900">Données synchronisées depuis APIDAE</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Ces fiches proviennent de l'API APIDAE via Make et sont liées au système de l'Office de Tourisme. 
                      Utilisez les actions ci-dessous pour gérer la synchronisation et la vérification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{fiches.length}</div>
                    <div className="text-sm text-muted-foreground">Total fiches</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
                    <div className="text-sm text-muted-foreground">Publiées</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{unsyncedCount}</div>
                    <div className="text-sm text-muted-foreground">Non synchronisées</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{alertsCount}</div>
                    <div className="text-sm text-muted-foreground">Alertes en attente</div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Synchronise les fiches modifiées vers Google Sheets pour intégration avec le site web de l'Office</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={verifySync} 
                      variant="outline" 
                      size="sm"
                      disabled={verifying || fiches.filter(f => f.synced_to_sheets).length === 0}
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 mr-2" />
                      )}
                      Vérifier Sync
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Vérifie si des fiches ont été supprimées du Google Sheet et les marque à resynchroniser</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => navigate("/admin/import-fiches")}
                      variant="outline"
                      size="sm"
                    >
                      <FileUp className="w-4 h-4 mr-2" />
                      Import JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Importe manuellement des fiches depuis un fichier JSON APIDAE</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Voir les différences détectées entre vos données et les sources internet (vérification automatique IA)</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex-1" />

                <Button 
                  onClick={loadAllFiches} 
                  variant="ghost" 
                  size="sm"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
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
                        <Radar className="w-3 h-3" /> Vérifiées (IA)
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

              {/* Table */}
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
                            const isFMA = fiche.fiche_type === "FETE_ET_MANIFESTATION";
                            const expired = isFMA && isOpeningExpired(fiche.data);
                            return (
                            <TableRow key={fiche.id} className={expired ? "opacity-60" : ""}>
                              <TableCell>
                                {!fiche.is_published ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <EyeOff className="w-3 h-3 mr-1" />
                                    Masqué
                                  </Badge>
                                ) : expired ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Expiré
                                  </Badge>
                                ) : (
                                  <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Publié
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => transferToVerified(fiche)}
                                        disabled={transferring === fiche.id}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        {transferring === fiche.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <ArrowRightLeft className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Transférer vers Apidia</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => togglePublish(fiche)}
                                        disabled={togglingPublish === fiche.id}
                                      >
                                        {togglingPublish === fiche.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : fiche.is_published ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{fiche.is_published ? "Masquer" : "Publier"}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedFiche(fiche)}
                                      >
                                        <Search className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Voir les détails</TooltipContent>
                                  </Tooltip>
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
            </TabsContent>

            {/* Apidia Tab */}
            <TabsContent value="apidia" className="space-y-6">
              {/* Description */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-900">Fiches optimisées par Apidia</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Ces fiches sont indépendantes du système APIDAE de l'Office de Tourisme. 
                      Elles ont été enrichies et optimisées par Apidia pour une meilleure visibilité.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{fichesApidia.length}</div>
                    <div className="text-sm text-muted-foreground">Fiches Apidia</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{alertsCount}</div>
                    <div className="text-sm text-muted-foreground">Alertes en attente</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{fiches.length}</div>
                    <div className="text-sm text-muted-foreground">Fiches APIDAE</div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Voir les alertes de vérification automatique</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex-1" />

                <Button 
                  onClick={loadFichesApidia} 
                  variant="ghost" 
                  size="sm"
                  disabled={loadingApidia}
                >
                  {loadingApidia ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, commune ou ID..."
                    value={searchTermApidia}
                    onChange={(e) => setSearchTermApidia(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilterApidia} onValueChange={setTypeFilterApidia}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {ficheTypesApidia.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-700">
                    {loadingApidia ? "Chargement..." : `${filteredFichesApidia.length} fiche(s) Apidia`}
                  </CardTitle>
                  <CardDescription>
                    {filteredFichesApidia.length !== fichesApidia.length && 
                      `(${fichesApidia.length} au total)`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingApidia ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                      <span className="ml-2">Chargement des fiches...</span>
                    </div>
                  ) : filteredFichesApidia.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {fichesApidia.length === 0 ? "Aucune fiche Apidia" : "Aucun résultat pour cette recherche"}
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
                            <TableHead>Vérifiée le</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFichesApidia.map((fiche) => (
                            <TableRow key={fiche.id}>
                              <TableCell>
                                {fiche.is_published ? (
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
                                {format(new Date(fiche.verified_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedFicheApidia(fiche)}
                                      >
                                        <Search className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Voir les détails</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => transferBack(fiche)}
                                        disabled={transferringBack === fiche.id}
                                      >
                                        {transferringBack === fiche.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <ArrowLeftRight className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Renvoyer vers APIDAE</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteConfirm(fiche)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Supprimer définitivement</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* APIDAE Detail Dialog */}
      <FicheDetailsDialog 
        open={!!selectedFiche} 
        onOpenChange={() => setSelectedFiche(null)}
        fiche={selectedFiche}
        onFicheUpdated={() => {
          setSelectedFiche(null);
          loadAllFiches();
        }}
      />

      {/* Apidia Detail Dialog */}
      {selectedFicheApidia && (
        <FicheDetailsDialog
          open={!!selectedFicheApidia}
          onOpenChange={(open) => !open && setSelectedFicheApidia(null)}
          fiche={selectedFicheApidia}
          onFicheUpdated={loadFichesApidia}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche "{deleteConfirm && extractNom(deleteConfirm.data)}" sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFicheApidia}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
