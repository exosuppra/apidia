import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Shield, LogOut, Users, FileText, Eye, Calendar, CalendarClock, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('admin_permissions')
        .select('page_key')
        .eq('user_id', user.id);

      setPermissions(data?.map(p => p.page_key) || []);
      setLoading(false);
    };

    fetchPermissions();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
    navigate("/admin/login");
  };

  const hasPermission = (pageKey: string) => permissions.includes(pageKey);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Tableau de bord Administrateur"
        description="Interface d'administration"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Administration</h1>
                <p className="text-sm text-muted-foreground">
                  Connecté en tant que {user?.email}
                </p>
              </div>
            </div>
            
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPermission('users') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gestion des utilisateurs
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Gérer les comptes utilisateurs et leurs permissions
                  </CardDescription>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => navigate("/admin/users")}
                  >
                    Accéder
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasPermission('requests') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Demandes utilisateurs
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Traiter les demandes de modification des fiches
                  </CardDescription>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => navigate("/admin/requests")}
                  >
                    Voir les demandes
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Historique des actions
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Voir l'historique des actions des utilisateurs
                </CardDescription>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate("/admin/logs")}
                >
                  Consulter l'historique
                </Button>
              </CardContent>
            </Card>

            {hasPermission('fiches') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toutes les fiches
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Voir toutes les fiches du Google Sheet (sauf SOURCING)
                  </CardDescription>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => navigate("/admin/fiches")}
                  >
                    Voir toutes les fiches
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasPermission('planning') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Planning éditorial social média
                  </CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Gérer le planning de publication sur les réseaux sociaux
                  </CardDescription>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => navigate("/admin/planning")}
                  >
                    Accéder au planning
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasPermission('rh') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Suivi RH - Projets IA
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Suivi des heures de travail et valorisation des projets IA
                  </CardDescription>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => navigate("/admin/rh")}
                  >
                    Accéder au suivi RH
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Générateur de planning
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Créer automatiquement des plannings de publication
                </CardDescription>
                <Button className="w-full mt-4" variant="outline">
                  Générer un planning
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Les dernières actions effectuées sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Aucune activité récente à afficher
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}