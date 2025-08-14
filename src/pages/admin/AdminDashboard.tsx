import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, History, AlertCircle, TrendingUp } from "lucide-react";
import Seo from "@/components/Seo";

interface DashboardStats {
  totalSheets: number;
  totalActions: number;
  pendingRequests: number;
  todayActions: number;
  recentActions: any[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSheets: 0,
    totalActions: 0,
    pendingRequests: 0,
    todayActions: 0,
    recentActions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.email) return;

      try {
        setLoading(true);

        // Récupérer les feuilles disponibles
        const { data: sheetsData } = await supabase.functions.invoke("admin-list-all-fiches", {
          body: { adminEmail: user.email }
        });

        // Récupérer l'historique
        const { data: historyData } = await supabase.functions.invoke("admin-get-history", {
          body: { 
            adminEmail: user.email,
            limit: 10
          }
        });

        // Calculer les statistiques
        const today = new Date().toISOString().split('T')[0];
        const todayActions = historyData?.data?.filter((action: any) => 
          action.created_at.startsWith(today)
        ).length || 0;

        const pendingRequests = historyData?.data?.filter((action: any) => 
          action.source === 'user_request' && action.status === 'pending'
        ).length || 0;

        setStats({
          totalSheets: sheetsData?.sheets?.length || 0,
          totalActions: historyData?.stats?.adminActions || 0,
          pendingRequests,
          todayActions,
          recentActions: historyData?.data?.slice(0, 5) || []
        });

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="grid place-items-center h-32">
        <div className="text-sm text-muted-foreground">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Tableau de bord administrateur | Apidia"
        description="Interface d'administration Apidia - Vue d'ensemble des activités et statistiques"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de l'administration Apidia
          </p>
        </div>

        {/* Statistiques principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feuilles Google</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSheets}</div>
              <p className="text-xs text-muted-foreground">
                Feuilles disponibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions totales</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <p className="text-xs text-muted-foreground">
                Actions effectuées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">
                Demandes à traiter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayActions}</div>
              <p className="text-xs text-muted-foreground">
                Actions du jour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Les dernières actions effectuées sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucune activité récente
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentActions.map((action: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{action.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.source === 'admin_action' ? action.admin_email : action.user_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={action.source === 'admin_action' ? 'default' : 'secondary'}>
                        {action.action_type || action.request_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(action.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Gérer les fiches</CardTitle>
              <CardDescription>
                Consulter et modifier toutes les fiches
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Valider les demandes</CardTitle>
              <CardDescription>
                Traiter les demandes de modification
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Consulter l'historique</CardTitle>
              <CardDescription>
                Voir toutes les actions effectuées
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </>
  );
}