import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Filter, RefreshCw } from "lucide-react";
import Seo from "@/components/Seo";

interface HistoryAction {
  id: string;
  admin_email?: string;
  user_email?: string;
  action_type?: string;
  request_type?: string;
  target_type: string;
  target_id: string;
  description: string;
  metadata: any;
  status?: string;
  created_at: string;
  source: 'admin_action' | 'user_request';
}

export default function AdminHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [actions, setActions] = useState<HistoryAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    actionType: "",
    targetType: "",
    startDate: "",
    endDate: ""
  });

  const loadHistory = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const { data } = await supabase.functions.invoke("admin-get-history", {
        body: { 
          adminEmail: user.email,
          limit: 100,
          ...filters
        }
      });

      if (data?.data) {
        setActions(data.data);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const getActionBadgeVariant = (action: HistoryAction) => {
    if (action.source === 'admin_action') {
      return 'default';
    }
    
    switch (action.status) {
      case 'pending': return 'destructive';
      case 'approved': return 'default';
      case 'rejected': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Seo
        title="Historique des actions | Administration Apidia"
        description="Historique complet de toutes les actions effectuées par les administrateurs et utilisateurs"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Historique des actions</h1>
          <p className="text-muted-foreground">
            Toutes les actions effectuées par les administrateurs et utilisateurs
          </p>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Type d'action</label>
                <Select value={filters.actionType} onValueChange={(value) => 
                  setFilters({...filters, actionType: value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="view">Consultation</SelectItem>
                    <SelectItem value="create">Création</SelectItem>
                    <SelectItem value="update">Modification</SelectItem>
                    <SelectItem value="delete">Suppression</SelectItem>
                    <SelectItem value="approve">Approbation</SelectItem>
                    <SelectItem value="reject">Rejet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Type de cible</label>
                <Select value={filters.targetType} onValueChange={(value) => 
                  setFilters({...filters, targetType: value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="fiche">Fiche</SelectItem>
                    <SelectItem value="sheet">Feuille</SelectItem>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="history">Historique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Date début</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Date fin</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadHistory} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Appliquer les filtres
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({ actionType: "", targetType: "", startDate: "", endDate: "" });
                  setTimeout(loadHistory, 100);
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Actions récentes</CardTitle>
              <CardDescription>
                {loading ? "Chargement..." : `${actions.length} action(s) trouvée(s)`}
              </CardDescription>
            </div>
            <Badge variant="outline">
              <Calendar className="h-4 w-4 mr-1" />
              Dernière mise à jour : {new Date().toLocaleTimeString()}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Chargement de l'historique...</div>
            ) : actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune action trouvée
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="text-xs">
                          {formatDate(action.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {action.admin_email || action.user_email}
                            </span>
                            <Badge 
                              variant={action.source === 'admin_action' ? 'default' : 'secondary'}
                              className="w-fit text-xs"
                            >
                              {action.source === 'admin_action' ? 'Admin' : 'User'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {action.action_type || action.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={action.description}>
                            {action.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{action.target_type}</span>
                            <span className="text-muted-foreground text-xs truncate max-w-24">
                              {action.target_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {action.status ? (
                            <Badge variant={getActionBadgeVariant(action)}>
                              {action.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}