import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  Clock,
  Play,
  Wand2,
  Settings,
  Save,
  Calendar,
  Trash2,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Seo from "@/components/Seo";
import VerificationProgressCard from "@/components/verification/VerificationProgressCard";

interface VerificationAlert {
  id: string;
  fiche_id: string;
  fiche_type: string | null;
  fiche_name: string | null;
  field_name: string;
  current_value: string | null;
  found_value: string | null;
  source_url: string;
  source_name: string | null;
  confidence_score: number | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

interface VerificationConfig {
  id: string;
  is_enabled: boolean;
  schedule_type: string;
  fiches_per_run: number;
  days_between_verification: number;
  exclude_recently_modified: boolean;
  days_consider_recent: number;
  exclude_recently_imported: boolean;
  days_consider_recent_import: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

const fieldLabels: Record<string, string> = {
  telephone: "Téléphone",
  email: "Email",
  site_web: "Site web",
  adresse: "Adresse",
  horaires: "Horaires",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "default" },
  confirmed: { label: "Confirmé", variant: "destructive" },
  ignored: { label: "Ignoré", variant: "secondary" },
  fixed: { label: "Corrigé", variant: "outline" },
};

const scheduleLabels: Record<string, string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
};

export default function VerificationAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<VerificationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<VerificationAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [applyingCorrection, setApplyingCorrection] = useState(false);
  const [runningVerification, setRunningVerification] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ignore' | 'delete' | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    ignored: 0,
    fixed: 0,
    distinctFichesTotal: 0,
    distinctFichesPending: 0,
  });

  // Configuration state
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pendingFichesCount, setPendingFichesCount] = useState(0);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_config")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data as VerificationConfig);
      }

      // Compter les fiches en attente de vérification
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - (data?.days_between_verification || 30));

      const { count } = await supabase
        .from("fiches_data")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`);

      setPendingFichesCount(count || 0);
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Erreur lors du chargement de la configuration");
    } finally {
      setConfigLoading(false);
    }
  };

  const calculateNextRunAt = (scheduleType: string): string => {
    const now = new Date();
    const next = new Date();
    
    // Prochaine exécution à 3h du matin
    next.setHours(3, 0, 0, 0);
    
    // Si 3h est déjà passé aujourd'hui, commencer demain
    if (now.getHours() >= 3) {
      next.setDate(next.getDate() + 1);
    }
    
    // Ajuster selon la fréquence
    if (scheduleType === 'weekly') {
      // Prochain lundi
      const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
    } else if (scheduleType === 'monthly') {
      // Premier du mois prochain
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
    }
    
    return next.toISOString();
  };

  const saveConfig = async () => {
    if (!config) return;

    setSavingConfig(true);
    try {
      // Ne recalculer next_run_at que si :
      // - on active/désactive la vérification
      // - on change le schedule_type
      // - il n'y a pas de next_run_at existant
      // Sinon, conserver la valeur existante pour ne pas décaler les exécutions
      let nextRunAt = config.next_run_at;
      if (!config.is_enabled) {
        nextRunAt = null;
      } else if (!nextRunAt) {
        nextRunAt = calculateNextRunAt(config.schedule_type);
      }
      
      const { error } = await supabase
        .from("verification_config")
        .update({
          is_enabled: config.is_enabled,
          schedule_type: config.schedule_type,
          fiches_per_run: config.fiches_per_run,
          days_between_verification: config.days_between_verification,
          exclude_recently_modified: config.exclude_recently_modified,
          days_consider_recent: config.days_consider_recent,
          exclude_recently_imported: config.exclude_recently_imported,
          days_consider_recent_import: config.days_consider_recent_import,
          next_run_at: nextRunAt,
        })
        .eq("id", config.id);

      if (error) throw error;

      setConfig({ ...config, next_run_at: nextRunAt });
      toast.success("Configuration sauvegardée");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingConfig(false);
    }
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Charger les alertes avec pagination (limite 1000 par défaut de Supabase)
      const { data, error } = await supabase
        .from("verification_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;

      const typedData = (data || []) as VerificationAlert[];
      setAlerts(typedData);

      // Compter les stats directement en base pour avoir les vrais totaux
      const [totalRes, pendingRes, confirmedRes, ignoredRes, fixedRes] = await Promise.all([
        supabase.from("verification_alerts").select("*", { count: "exact", head: true }),
        supabase.from("verification_alerts").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("verification_alerts").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("verification_alerts").select("*", { count: "exact", head: true }).eq("status", "ignored"),
        supabase.from("verification_alerts").select("*", { count: "exact", head: true }).eq("status", "fixed"),
      ]);

      // Compute distinct fiche counts from loaded data
      const allFicheIds = new Set(typedData.map(a => a.fiche_id));
      const pendingFicheIds = new Set(typedData.filter(a => a.status === "pending").map(a => a.fiche_id));

      setStats({
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        confirmed: confirmedRes.count || 0,
        ignored: ignoredRes.count || 0,
        fixed: fixedRes.count || 0,
        distinctFichesTotal: allFicheIds.size,
        distinctFichesPending: pendingFicheIds.size,
      });
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Erreur lors du chargement des alertes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadConfig();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchTerm === "" ||
      alert.fiche_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.fiche_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    const matchesField = fieldFilter === "all" || alert.field_name === fieldFilter;
    return matchesSearch && matchesStatus && matchesField;
  });

  const handleViewDetails = (alert: VerificationAlert) => {
    setSelectedAlert(alert);
    setNotes(alert.notes || "");
    setDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedAlert) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("verification_alerts")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          notes: notes,
        })
        .eq("id", selectedAlert.id);

      if (error) throw error;

      toast.success("Statut mis à jour");
      setDialogOpen(false);
      loadAlerts();
    } catch (error) {
      console.error("Error updating alert:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const handleApplyCorrection = async () => {
    if (!selectedAlert) return;

    setApplyingCorrection(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userData?.user?.id)
        .single();
      
      const actorName = profileData?.first_name && profileData?.last_name 
        ? `${profileData.first_name} ${profileData.last_name}`
        : userData?.user?.email || 'Admin';

      const { data, error } = await supabase.functions.invoke('apply-fiche-correction', {
        body: {
          alert_id: selectedAlert.id,
          actor_id: userData?.user?.id,
          actor_name: actorName,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Correction appliquée : ${data.field} mis à jour`);
        setDialogOpen(false);
        loadAlerts();
      } else {
        toast.error(data.error || "Erreur lors de l'application");
      }
    } catch (error) {
      console.error("Error applying correction:", error);
      toast.error("Erreur lors de l'application de la correction");
    } finally {
      setApplyingCorrection(false);
    }
  };

  const handleRunVerification = async () => {
    setRunningVerification(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-all-fiches", {
        body: { 
          manual: true,
          limit: config?.fiches_per_run || 10, 
          days_since_verification: config?.days_between_verification || 30 
        },
      });

      if (error) throw error;

      if (data.success && data.started) {
        toast.success(`Vérification de ${data.total} fiches lancée en arrière-plan`);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error running verification:", error);
      toast.error("Erreur lors du lancement de la vérification");
    } finally {
      setRunningVerification(false);
    }
  };

  const handleVerificationComplete = () => {
    loadAlerts();
    loadConfig();
  };

  return (
    <>
      <Seo 
        title="Alertes de vérification - Administration"
        description="Gestion des alertes de vérification des fiches APIDAE"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin/fiches")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux fiches
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Alertes de vérification</h1>
                <p className="text-sm text-muted-foreground">
                  Différences détectées entre les données APIDAE et les sources internet
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAlerts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              <Button onClick={handleRunVerification} disabled={runningVerification}>
                {runningVerification ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Lancer une vérification
              </Button>
            </div>
          </div>

          {/* Real-time Progress Card */}
          <VerificationProgressCard onComplete={handleVerificationComplete} />

          {/* Configuration Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Configuration automatique</CardTitle>
                </div>
                <Button 
                  onClick={saveConfig} 
                  disabled={savingConfig || !config}
                  size="sm"
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              </div>
              <CardDescription>
                Configurez la vérification automatique des fiches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : config ? (
                <div className="space-y-6">
                  {/* Activation toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Vérification automatique</Label>
                      <p className="text-sm text-muted-foreground">
                        Activer la vérification automatique des fiches selon le planning configuré
                      </p>
                    </div>
                    <Switch
                      checked={config.is_enabled}
                      onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
                    />
                  </div>

                  {/* Configuration grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Fréquence */}
                    <div className="space-y-2">
                      <Label>Fréquence</Label>
                      <Select
                        value={config.schedule_type}
                        onValueChange={(value) => setConfig({ ...config, schedule_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Quotidien</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fiches par exécution */}
                    <div className="space-y-2">
                      <Label>Fiches par exécution</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5000}
                        value={config.fiches_per_run}
                        onChange={(e) => setConfig({ ...config, fiches_per_run: parseInt(e.target.value) || 30 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum 5000 fiches par exécution (traitement automatique en boucle)
                      </p>
                    </div>

                    {/* Jours entre vérifications */}
                    <div className="space-y-2">
                      <Label>Jours entre vérifications</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={config.days_between_verification}
                        onChange={(e) => setConfig({ ...config, days_between_verification: parseInt(e.target.value) || 30 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Une modification manuelle ou un import réinitialise ce compteur
                      </p>
                    </div>
                  </div>

                  {/* Options avancées */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground">Options avancées</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Exclure les fiches récemment modifiées</Label>
                        <p className="text-xs text-muted-foreground">
                          Ne pas vérifier les fiches modifiées manuellement récemment
                        </p>
                      </div>
                      <Switch
                        checked={config.exclude_recently_modified}
                        onCheckedChange={(checked) => setConfig({ ...config, exclude_recently_modified: checked })}
                      />
                    </div>

                    {config.exclude_recently_modified && (
                      <div className="space-y-2 ml-4 pl-4 border-l-2">
                        <Label className="text-sm">Considérer comme "récente" si modifiée dans les derniers</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            className="w-20"
                            value={config.days_consider_recent}
                            onChange={(e) => setConfig({ ...config, days_consider_recent: parseInt(e.target.value) || 7 })}
                          />
                          <span className="text-sm text-muted-foreground">jours</span>
                        </div>
                      </div>
                    )}

                    {/* Exclure les fiches récemment importées */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Exclure les fiches récemment importées</Label>
                        <p className="text-xs text-muted-foreground">
                          Ne pas vérifier les fiches importées (synchronisation Apidae) récemment
                        </p>
                      </div>
                      <Switch
                        checked={config.exclude_recently_imported}
                        onCheckedChange={(checked) => setConfig({ ...config, exclude_recently_imported: checked })}
                      />
                    </div>

                    {config.exclude_recently_imported && (
                      <div className="space-y-2 ml-4 pl-4 border-l-2">
                        <Label className="text-sm">Considérer comme "récente" si importée dans les derniers</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            className="w-20"
                            value={config.days_consider_recent_import}
                            onChange={(e) => setConfig({ ...config, days_consider_recent_import: parseInt(e.target.value) || 7 })}
                          />
                          <span className="text-sm text-muted-foreground">jours</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status info */}
                  <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dernière exécution</p>
                        <p className="text-sm font-medium">
                          {config.last_run_at 
                            ? format(new Date(config.last_run_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                            : "Jamais"
                          }
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.is_enabled ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/30'}`}>
                      {config.is_enabled ? (
                        <Clock className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Prochaine exécution</p>
                        <p className={`text-sm font-medium ${config.is_enabled ? 'text-green-700' : ''}`}>
                          {config.is_enabled && config.next_run_at
                            ? format(new Date(config.next_run_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                            : config.is_enabled
                              ? "En attente de planification"
                              : "Désactivé"
                          }
                        </p>
                        {config.is_enabled && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {scheduleLabels[config.schedule_type]} • {config.fiches_per_run} fiches/exécution
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fiches en attente</p>
                        <p className="text-sm font-medium">{pendingFichesCount} fiches</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Configuration non disponible</p>
              )}
            </CardContent>
          </Card>

          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total alertes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.distinctFichesTotal} fiches distinctes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  En attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.distinctFichesPending} fiches distinctes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Confirmés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.confirmed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  Ignorés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.ignored}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Corrigés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.fixed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou ID de fiche..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="ignored">Ignoré</SelectItem>
                    <SelectItem value="fixed">Corrigé</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fieldFilter} onValueChange={setFieldFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Champ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les champs</SelectItem>
                    <SelectItem value="telephone">Téléphone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="site_web">Site web</SelectItem>
                    <SelectItem value="adresse">Adresse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alerts table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune alerte trouvée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fiche</TableHead>
                      <TableHead>Champ</TableHead>
                      <TableHead>Valeur actuelle</TableHead>
                      <TableHead>Valeur trouvée</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium truncate max-w-[200px]">
                              {alert.fiche_name || alert.fiche_id}
                            </div>
                            <div className="text-xs text-muted-foreground">{alert.fiche_type}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{fieldLabels[alert.field_name] || alert.field_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[150px] block">
                            {alert.current_value || <span className="text-muted-foreground italic">Non renseigné</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[150px] block text-orange-600 font-medium">
                            {alert.found_value}
                          </span>
                        </TableCell>
                        <TableCell>
                          <a
                            href={alert.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {alert.source_name || "Source"}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[alert.status]?.variant || "default"}>
                            {statusLabels[alert.status]?.label || alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(alert.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(alert)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Détail de l'alerte</DialogTitle>
                <DialogDescription>
                  {selectedAlert?.fiche_name} - {fieldLabels[selectedAlert?.field_name || ""] || selectedAlert?.field_name}
                </DialogDescription>
              </DialogHeader>

              {selectedAlert && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Valeur actuelle (APIDAE)</label>
                      <div className="p-3 bg-muted rounded-md">
                        {selectedAlert.current_value || (
                          <span className="text-muted-foreground italic">Non renseigné</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-600">Valeur trouvée sur internet</label>
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-orange-800">
                        {selectedAlert.found_value}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Source</label>
                    <a
                      href={selectedAlert.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted rounded-md text-primary hover:underline break-all"
                    >
                      {selectedAlert.source_url}
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>

                  {selectedAlert.confidence_score !== null && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Score de confiance</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(selectedAlert.confidence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round((selectedAlert.confidence_score || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ajoutez des notes sur cette alerte..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus("ignored")}
                  disabled={updating || applyingCorrection}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Ignorer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus("confirmed")}
                  disabled={updating || applyingCorrection}
                  className="flex-1"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirmer le problème
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleApplyCorrection}
                  disabled={updating || applyingCorrection || selectedAlert?.status === 'fixed'}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {applyingCorrection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Appliquer la correction
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
