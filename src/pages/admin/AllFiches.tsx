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
  ArrowLeftRight, Info, CloudDownload, Settings, Clock, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import ApidaeSyncProgressCard from "@/components/sync/ApidaeSyncProgressCard";
import { logUserAction } from "@/lib/logUserAction";
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
  const [communeFilter, setCommuneFilter] = useState<string>("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("published");
  const [selectedFiche, setSelectedFiche] = useState<FicheData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sheetsSyncProgress, setSheetsSyncProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [syncingApidae, setSyncingApidae] = useState(false);
  const [makeSyncRunning, setMakeSyncRunning] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<{
    orphans_count: number;
    db_total: number;
    apidae_total: number;
    sample: Array<{ fiche_id: string; nom: string }>;
  } | null>(null);
  const [apidaeSyncProgress, setApidaeSyncProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [apidaeSyncConfig, setApidaeSyncConfig] = useState<{
    id: string;
    is_enabled: boolean;
    schedule_type: string;
    sync_hour: number;
    fiches_per_sync: number;
    selection_ids: number[];
    last_sync_at: string | null;
    next_sync_at: string | null;
    last_sync_result: Json | null;
  } | null>(null);
  
  // Verification config for auto-push toggle
  const [verificationConfig, setVerificationConfig] = useState<{
    id: string;
    auto_push_to_apidae: boolean;
  } | null>(null);
  const [selectionIdsInput, setSelectionIdsInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [syncHistory, setSyncHistory] = useState<Array<{
    id: string;
    sync_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    fiches_synced: number;
    fiches_created: number;
    fiches_updated: number;
    error_message: string | null;
    triggered_by: string | null;
  }>>([]);
  const [loadingSyncHistory, setLoadingSyncHistory] = useState(false);

  // Apidia state
  const [fichesApidia, setFichesApidia] = useState<FicheVerified[]>([]);
  const [filteredFichesApidia, setFilteredFichesApidia] = useState<FicheVerified[]>([]);
  const [loadingApidia, setLoadingApidia] = useState(true);
  const [searchTermApidia, setSearchTermApidia] = useState("");
  const [typeFilterApidia, setTypeFilterApidia] = useState<string>("all");
  const [communeFilterApidia, setCommuneFilterApidia] = useState<string>("all");
  const [transferringBack, setTransferringBack] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FicheVerified | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFicheApidia, setSelectedFicheApidia] = useState<FicheVerified | null>(null);

  // Pagination APIDAE
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageApidia, setCurrentPageApidia] = useState(1);
  const ITEMS_PER_PAGE = 50;

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

  // Load Apidae sync config
  const loadApidaeSyncConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('apidae_sync_config')
        .select('*')
        .single();
      
      if (error) throw error;
      setApidaeSyncConfig(data);
      // Initialize selectionIdsInput from config
      if (data?.selection_ids?.length > 0) {
        setSelectionIdsInput(data.selection_ids.join(', '));
      }
    } catch (error) {
      console.error('Erreur chargement config Apidae:', error);
    }
  };

  // Load verification config for auto-push toggle
  const loadVerificationConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_config')
        .select('id, auto_push_to_apidae')
        .single();
      
      if (error) throw error;
      setVerificationConfig(data);
    } catch (error) {
      console.error('Erreur chargement config verification:', error);
    }
  };

  // Save auto-push toggle
  const saveAutoPushSetting = async (enabled: boolean) => {
    if (!verificationConfig) return;
    try {
      const { error } = await supabase
        .from('verification_config')
        .update({ auto_push_to_apidae: enabled })
        .eq('id', verificationConfig.id);

      if (error) throw error;
      
      setVerificationConfig({ ...verificationConfig, auto_push_to_apidae: enabled });
      toast({
        title: enabled ? "Push automatique activé" : "Push automatique désactivé",
        description: enabled 
          ? "Les corrections vérifiées seront automatiquement poussées vers Apidae"
          : "Les corrections ne seront plus poussées automatiquement",
      });
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le paramètre",
        variant: "destructive",
      });
    }
  };

  // Sync from Apidae API - fetches ALL fiches from the selection progressively
  const syncFromApidae = async () => {
    setSyncingApidae(true);
    setApidaeSyncProgress({ current: 0, total: 0, percentage: 0 });
    try {
      const selectionIds = apidaeSyncConfig?.selection_ids || [];
      const batchSize = apidaeSyncConfig?.fiches_per_sync || 200;
      
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalErrors: string[] = [];
      let offset = 0;
      let hasMore = true;
      let totalFiches = 0;
      
      // Loop to fetch all fiches in batches
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('fetch-apidae-fiches', {
          body: { 
            count: batchSize,
            first: offset,
            selectionIds 
          }
        });

        if (error) throw error;

        totalInserted += data.inserted || 0;
        totalUpdated += data.updated || 0;
        if (data.errors?.length > 0) {
          totalErrors = [...totalErrors, ...data.errors];
        }
        
        // Get total from first response
        if (totalFiches === 0) {
          totalFiches = data.total || 0;
        }
        
        // Check if there are more fiches to fetch
        const processed = data.processed || 0;
        
        offset += batchSize;
        hasMore = offset < totalFiches && processed > 0;
        
        // Update progress
        const currentProgress = Math.min(offset, totalFiches);
        const percentage = totalFiches > 0 ? Math.round((currentProgress / totalFiches) * 100) : 0;
        setApidaeSyncProgress({
          current: currentProgress,
          total: totalFiches,
          percentage
        });
      }

      toast({
        title: "Synchronisation Apidae terminée",
        description: `${totalInserted} nouvelles, ${totalUpdated} mises à jour${totalErrors.length > 0 ? `, ${totalErrors.length} erreurs` : ''}`,
      });

      await loadAllFiches();
      await loadApidaeSyncConfig();
    } catch (error: unknown) {
      console.error('Erreur sync Apidae:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser depuis Apidae",
        variant: "destructive",
      });
    } finally {
      setSyncingApidae(false);
      setApidaeSyncProgress(null);
    }
  };

  // Cleanup orphan Apidae fiches (not present in current selection anymore)
  const openCleanupDialog = async () => {
    setCleanupOpen(true);
    setCleanupLoading(true);
    setCleanupPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-apidae-orphans", {
        body: { dryRun: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'analyse");
      setCleanupPreview({
        orphans_count: data.orphans_count || 0,
        db_total: data.db_total || 0,
        apidae_total: data.apidae_total || 0,
        sample: data.orphans || [],
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'analyse",
        description: err?.message || "Impossible d'analyser les fiches orphelines",
        variant: "destructive",
      });
      setCleanupOpen(false);
    } finally {
      setCleanupLoading(false);
    }
  };

  const confirmCleanup = async () => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-apidae-orphans", {
        body: { dryRun: false, triggeredBy: "manual-ui" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors du nettoyage");
      toast({
        title: "Nettoyage terminé",
        description: `${data.deleted || 0} fiche(s) supprimée(s) de la base.`,
      });
      setCleanupOpen(false);
      setCleanupPreview(null);
      await loadAllFiches();
    } catch (err: any) {
      toast({
        title: "Erreur de nettoyage",
        description: err?.message || "Impossible de supprimer les fiches",
        variant: "destructive",
      });
    } finally {
      setCleanupLoading(false);
    }
  };


  const saveApidaeSyncConfig = async () => {
    if (!apidaeSyncConfig) return;
    setSavingConfig(true);
    try {
      // Parse selection IDs from input
      const parsedSelectionIds = selectionIdsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(s => parseInt(s))
        .filter(n => !isNaN(n));

      const { error } = await supabase
        .from('apidae_sync_config')
        .update({
          is_enabled: apidaeSyncConfig.is_enabled,
          schedule_type: apidaeSyncConfig.schedule_type,
          sync_hour: apidaeSyncConfig.sync_hour,
          fiches_per_sync: apidaeSyncConfig.fiches_per_sync,
          selection_ids: parsedSelectionIds,
        })
        .eq('id', apidaeSyncConfig.id);

      if (error) throw error;

      // Update local state immediately so next manual sync uses the new config
      setApidaeSyncConfig({
        ...apidaeSyncConfig,
        selection_ids: parsedSelectionIds,
        fiches_per_sync: apidaeSyncConfig.fiches_per_sync,
      });

      toast({
        title: "Configuration enregistrée",
        description: apidaeSyncConfig.is_enabled 
          ? `Synchronisation automatique ${apidaeSyncConfig.schedule_type === 'hourly' ? 'toutes les heures' : apidaeSyncConfig.schedule_type === 'daily' ? 'quotidienne' : 'hebdomadaire'}`
          : "Synchronisation automatique désactivée",
      });

      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Load sync history
  const loadSyncHistory = async () => {
    setLoadingSyncHistory(true);
    try {
      const { data, error } = await supabase
        .from('apidae_sync_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoadingSyncHistory(false);
    }
  };

  // Load history when config dialog opens
  useEffect(() => {
    if (configDialogOpen) {
      loadSyncHistory();
    }
  }, [configDialogOpen]);

  // APIDAE functions - fetch ALL fiches with pagination to avoid 1000 row limit
  const loadAllFiches = async () => {
    setLoading(true);
    try {
      const allFiches: FicheData[] = [];
      const pageSize = 500;
      let offset = 0;
      let hasMore = true;
      let retries = 0;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('fiches_data')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) {
          // Retry en cas de statement timeout
          if ((error as any).code === '57014' && retries < 2) {
            retries++;
            await new Promise(r => setTimeout(r, 800));
            continue;
          }
          throw error;
        }
        retries = 0;
        
        if (data && data.length > 0) {
          allFiches.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      setFiches(allFiches);
      setFilteredFiches(allFiches);
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
    const totalToSync = unsyncedCount;
    if (totalToSync === 0) return;
    
    setSyncing(true);
    setSheetsSyncProgress({ current: 0, total: totalToSync, percentage: 0 });
    
    // Simulate progress while waiting for the actual sync
    const progressInterval = setInterval(() => {
      setSheetsSyncProgress(prev => {
        if (!prev) return null;
        // Increment slowly, max 90% until real completion
        const newPercentage = Math.min(prev.percentage + Math.random() * 5, 90);
        const newCurrent = Math.floor((newPercentage / 100) * prev.total);
        return { ...prev, current: newCurrent, percentage: Math.round(newPercentage) };
      });
    }, 500);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
        method: 'POST'
      });

      if (error) throw error;

      // Complete the progress
      setSheetsSyncProgress({ current: totalToSync, total: totalToSync, percentage: 100 });
      
      toast({
        title: "Synchronisation terminée",
        description: data.message || `${data.results?.synced || 0} fiches synchronisées`,
      });
      logUserAction("sync_sheets", { synced: data.results?.synced || 0 });

      await loadAllFiches();
    } catch (error: unknown) {
      console.error('Erreur lors de la synchronisation:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser vers Google Sheets",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setSheetsSyncProgress(null), 1500);
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
      logUserAction("toggle_publish_fiche", { fiche_id: fiche.fiche_id, published: newStatus });

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
  // Apidia functions - fetch ALL fiches with pagination to avoid 1000 row limit
  const loadFichesApidia = async () => {
    setLoadingApidia(true);
    try {
      const allFiches: FicheVerified[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('fiches_verified')
          .select('*')
          .order('verified_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allFiches.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      setFichesApidia(allFiches);
      setFilteredFichesApidia(allFiches);
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
    loadApidaeSyncConfig();
    loadVerificationConfig();
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

    if (communeFilter !== "all") {
      result = result.filter(f => extractCommune(f.data) === communeFilter);
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
    setCurrentPage(1); // Reset to first page when filters change
  }, [fiches, typeFilter, communeFilter, searchTerm, publishFilter]);

  useEffect(() => {
    let result = fichesApidia;

    if (typeFilterApidia !== "all") {
      result = result.filter(f => f.fiche_type === typeFilterApidia);
    }

    if (communeFilterApidia !== "all") {
      result = result.filter(f => extractCommune(f.data) === communeFilterApidia);
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
    setCurrentPageApidia(1); // Reset to first page when filters change
  }, [fichesApidia, typeFilterApidia, communeFilterApidia, searchTermApidia]);

  const ficheTypes = [...new Set(fiches.map(f => f.fiche_type))].sort();
  const ficheTypesApidia = [...new Set(fichesApidia.map(f => f.fiche_type))].sort();
  const communes = [...new Set(fiches.map(f => extractCommune(f.data)).filter(c => c !== "-"))].sort();
  const communesApidia = [...new Set(fichesApidia.map(f => extractCommune(f.data)).filter(c => c !== "-"))].sort();

  // Pagination calculations
  const totalPages = Math.ceil(filteredFiches.length / ITEMS_PER_PAGE);
  const totalPagesApidia = Math.ceil(filteredFichesApidia.length / ITEMS_PER_PAGE);
  const paginatedFiches = filteredFiches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedFichesApidia = filteredFichesApidia.slice(
    (currentPageApidia - 1) * ITEMS_PER_PAGE,
    currentPageApidia * ITEMS_PER_PAGE
  );

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
              {/* Sync Progress Card */}
              <ApidaeSyncProgressCard 
                onComplete={loadAllFiches} 
                onSyncStatusChange={setMakeSyncRunning}
              />
              
              {/* Description */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900">Données synchronisées depuis APIDAE</h3>
                    <p className="text-sm text-blue-700 mt-1 mb-2">
                      Ce système récupère les fiches directement depuis l'<strong>API APIDAE</strong>, la base de données 
                      touristique de référence utilisée par les Offices de Tourisme en France.
                    </p>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Sources des données :</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5 text-blue-600">
                        <li><strong>APIDAE</strong> : Base nationale des données touristiques (hébergements, restaurants, activités, événements...)</li>
                        <li><strong>Sélections territoriales</strong> : Ensembles de fiches regroupées par votre territoire/destination</li>
                        <li><strong>Synchronisation automatique</strong> : Mise à jour régulière pour refléter les modifications faites dans APIDAE</li>
                      </ul>
                    </div>
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
                {/* Progress bar during Sheets sync */}
                {syncing && sheetsSyncProgress && (
                  <div className="flex items-center gap-3 min-w-[200px] mr-2">
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300 ease-out"
                          style={{ width: `${sheetsSyncProgress.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sheetsSyncProgress.current.toLocaleString()}/{sheetsSyncProgress.total.toLocaleString()} fiches ({sheetsSyncProgress.percentage}%)
                      </p>
                    </div>
                  </div>
                )}
                
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
                      {unsyncedCount > 0 && !syncing && (
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
                      onClick={openCleanupDialog}
                      variant="outline"
                      size="sm"
                      disabled={syncingApidae || makeSyncRunning || cleanupLoading}
                    >
                      {cleanupLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Nettoyer obsolètes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Supprime les fiches Apidae qui ne sont plus présentes dans la sélection territoriale (fiches retirées d'Apidae)</p>
                  </TooltipContent>
                </Tooltip>

                <div className="border-l border-border pl-2 ml-2 flex items-center gap-2">
                  {/* Progress bar during sync */}
                  {syncingApidae && apidaeSyncProgress && (
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${apidaeSyncProgress.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {apidaeSyncProgress.current.toLocaleString()}/{apidaeSyncProgress.total.toLocaleString()} fiches ({apidaeSyncProgress.percentage}%)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={syncFromApidae} 
                        variant="secondary" 
                        size="sm"
                        disabled={syncingApidae || makeSyncRunning}
                      >
                        {syncingApidae ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CloudDownload className="w-4 h-4 mr-2" />
                        )}
                        {syncingApidae ? "Sync en cours..." : "Sync Apidae"}
                        {!syncingApidae && apidaeSyncConfig?.selection_ids?.length === 0 && (
                          <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                            !
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      {makeSyncRunning ? (
                        <p className="text-blue-600">🔄 Synchronisation automatique en cours (via Make) - attendez qu'elle se termine</p>
                      ) : apidaeSyncConfig?.selection_ids?.length === 0 ? (
                        <p className="text-orange-600">⚠️ Aucune sélection configurée - cliquez sur ⚙️ pour ajouter vos IDs de sélection territoriale</p>
                      ) : (
                        <p>Récupère les dernières fiches depuis l'API Apidae ({apidaeSyncConfig?.selection_ids?.length || 0} sélection(s))</p>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configuration Apidae</DialogTitle>
                        <DialogDescription>
                          Configurez les sélections territoriales à synchroniser
                        </DialogDescription>
                      </DialogHeader>
                      
                      {apidaeSyncConfig && (
                        <div className="space-y-4 py-4">
                          {/* Auto-push to Apidae toggle */}
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <Label htmlFor="auto-push-enabled" className="flex flex-col gap-1">
                              <span className="flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4" />
                                Push automatique vers Apidae
                              </span>
                              <span className="text-sm font-normal text-muted-foreground">
                                Pousse automatiquement les corrections vers Apidae après vérification IA
                              </span>
                            </Label>
                            <Switch
                              id="auto-push-enabled"
                              checked={verificationConfig?.auto_push_to_apidae || false}
                              onCheckedChange={(checked) => saveAutoPushSetting(checked)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="selection-ids" className="flex flex-col gap-1">
                              <span>IDs des sélections territoriales</span>
                              <span className="text-sm font-normal text-muted-foreground">
                                Récupérez les IDs depuis votre interface Apidae (séparés par des virgules)
                              </span>
                            </Label>
                            <Input
                              id="selection-ids"
                              placeholder="Ex: 12345, 67890"
                              value={selectionIdsInput}
                              onChange={(e) => setSelectionIdsInput(e.target.value)}
                            />
                            {apidaeSyncConfig.selection_ids?.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Actuellement: {apidaeSyncConfig.selection_ids.join(', ')}
                              </p>
                            )}
                          </div>

                          {apidaeSyncConfig.last_sync_at && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Dernière sync: {format(new Date(apidaeSyncConfig.last_sync_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Sync History */}
                          <div className="pt-4 border-t">
                            <Label className="flex items-center gap-2 mb-3">
                              <Database className="w-4 h-4" />
                              Historique des synchronisations
                            </Label>
                            {loadingSyncHistory ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : syncHistory.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Aucun historique de synchronisation
                              </p>
                            ) : (
                              <div className="max-h-[200px] overflow-y-auto space-y-2">
                                {syncHistory.map((entry) => (
                                  <div 
                                    key={entry.id} 
                                    className={`text-xs p-2 rounded border ${
                                      entry.status === 'success' 
                                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                                        : entry.status === 'error'
                                        ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {entry.status === 'success' ? (
                                          <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : entry.status === 'error' ? (
                                          <XCircle className="w-3 h-3 text-red-600" />
                                        ) : (
                                          <AlertTriangle className="w-3 h-3 text-yellow-600" />
                                        )}
                                        <span className="font-medium">
                                          {entry.sync_type === 'automatic' ? '🔗 Make' : '👤 Manuel'}
                                        </span>
                                      </div>
                                      <span className="text-muted-foreground">
                                        {format(new Date(entry.started_at), "dd/MM HH:mm", { locale: fr })}
                                      </span>
                                    </div>
                                    {entry.status === 'success' && (
                                      <p className="mt-1 text-muted-foreground">
                                        {entry.fiches_synced} fiches ({entry.fiches_created} nouvelles, {entry.fiches_updated} màj)
                                      </p>
                                    )}
                                    {entry.status === 'error' && entry.error_message && (
                                      <p className="mt-1 text-red-600 truncate" title={entry.error_message}>
                                        {entry.error_message}
                                      </p>
                                    )}
                                    {entry.status === 'skipped' && entry.error_message && (
                                      <p className="mt-1 text-yellow-700 dark:text-yellow-400">
                                        {entry.error_message}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t">
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                <strong>💡 Synchronisation automatique via Make</strong><br />
                                La synchronisation est déclenchée automatiquement par vos workflows Make. 
                                Utilisez le bouton "Sync Apidae" pour une synchronisation manuelle.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={saveApidaeSyncConfig} disabled={savingConfig}>
                          {savingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Enregistrer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

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
                  <SelectTrigger className="w-full sm:w-[200px]">
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
                <Select value={communeFilter} onValueChange={setCommuneFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrer par commune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les communes</SelectItem>
                    {communes.map(commune => (
                      <SelectItem key={commune} value={commune}>
                        {commune}
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
                          {paginatedFiches.map((fiche) => {
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
                  
                  {/* Pagination APIDAE */}
                  {filteredFiches.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredFiches.length)} sur {filteredFiches.length} fiches
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Précédent
                        </Button>
                        <span className="text-sm font-medium px-2">
                          Page {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Suivant
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
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
                  <SelectTrigger className="w-full sm:w-[200px]">
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
                <Select value={communeFilterApidia} onValueChange={setCommuneFilterApidia}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrer par commune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les communes</SelectItem>
                    {communesApidia.map(commune => (
                      <SelectItem key={commune} value={commune}>
                        {commune}
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
                          {paginatedFichesApidia.map((fiche) => (
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
                  
                  {/* Pagination Apidia */}
                  {filteredFichesApidia.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Affichage {((currentPageApidia - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPageApidia * ITEMS_PER_PAGE, filteredFichesApidia.length)} sur {filteredFichesApidia.length} fiches
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageApidia(p => Math.max(1, p - 1))}
                          disabled={currentPageApidia === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Précédent
                        </Button>
                        <span className="text-sm font-medium px-2">
                          Page {currentPageApidia} / {totalPagesApidia}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageApidia(p => Math.min(totalPagesApidia, p + 1))}
                          disabled={currentPageApidia === totalPagesApidia}
                        >
                          Suivant
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Cleanup Apidae orphans dialog */}
      <AlertDialog open={cleanupOpen} onOpenChange={(open) => { if (!cleanupLoading) setCleanupOpen(open); }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Nettoyer les fiches Apidae obsolètes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {cleanupLoading && !cleanupPreview && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours…
                  </div>
                )}
                {cleanupPreview && (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-muted">
                        <div className="text-2xl font-bold">{cleanupPreview.db_total}</div>
                        <div className="text-xs text-muted-foreground">En base</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <div className="text-2xl font-bold text-green-600">{cleanupPreview.apidae_total}</div>
                        <div className="text-xs text-muted-foreground">Sur Apidae</div>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/10">
                        <div className="text-2xl font-bold text-destructive">{cleanupPreview.orphans_count}</div>
                        <div className="text-xs text-muted-foreground">À supprimer</div>
                      </div>
                    </div>
                    {cleanupPreview.orphans_count > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Les fiches suivantes sont en base mais ne sont plus présentes dans la sélection Apidae.
                          Elles seront <strong>définitivement supprimées</strong>.
                        </p>
                        <div className="max-h-64 overflow-auto border rounded-lg p-2 text-sm bg-muted/30">
                          {cleanupPreview.sample.slice(0, 50).map((f) => (
                            <div key={f.fiche_id} className="py-1 border-b last:border-0">
                              <span className="font-mono text-xs text-muted-foreground mr-2">{f.fiche_id}</span>
                              {f.nom}
                            </div>
                          ))}
                          {cleanupPreview.orphans_count > 50 && (
                            <div className="py-1 text-xs text-muted-foreground italic">
                              … et {cleanupPreview.orphans_count - 50} autres
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-green-600">
                        ✅ Aucune fiche obsolète détectée. La base est synchronisée avec Apidae.
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleanupLoading}>Annuler</AlertDialogCancel>
            {cleanupPreview && cleanupPreview.orphans_count > 0 && (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); confirmCleanup(); }}
                disabled={cleanupLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Supprimer {cleanupPreview.orphans_count} fiche(s)
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
