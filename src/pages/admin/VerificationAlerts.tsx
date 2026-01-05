import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  CheckCircle,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  Clock,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function VerificationAlerts() {
  const [alerts, setAlerts] = useState<VerificationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<VerificationAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [runningVerification, setRunningVerification] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    ignored: 0,
    fixed: 0,
  });

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Type assertion since we know the structure
      const typedData = (data || []) as VerificationAlert[];
      setAlerts(typedData);

      // Calculate stats
      const newStats = {
        total: typedData.length,
        pending: typedData.filter((a) => a.status === "pending").length,
        confirmed: typedData.filter((a) => a.status === "confirmed").length,
        ignored: typedData.filter((a) => a.status === "ignored").length,
        fixed: typedData.filter((a) => a.status === "fixed").length,
      };
      setStats(newStats);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Erreur lors du chargement des alertes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
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

  const handleRunVerification = async () => {
    setRunningVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-all-fiches", {
        body: { limit: 10, days_since_verification: 30 },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          `Vérification terminée : ${data.verified} fiches vérifiées, ${data.details?.filter((d: any) => d.alerts_count > 0).length || 0} avec alertes`
        );
        loadAlerts();
      } else {
        toast.error(data.error || "Erreur lors de la vérification");
      }
    } catch (error) {
      console.error("Error running verification:", error);
      toast.error("Erreur lors de la vérification");
    } finally {
      setRunningVerification(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertes de vérification</h1>
          <p className="text-muted-foreground">
            Différences détectées entre les données APIDAE et les sources internet
          </p>
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

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
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
      <Card>
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
              disabled={updating}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Ignorer
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus("confirmed")}
              disabled={updating}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Confirmer le problème
            </Button>
            <Button
              variant="default"
              onClick={() => handleUpdateStatus("fixed")}
              disabled={updating}
              className="flex-1"
            >
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Marquer comme corrigé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
