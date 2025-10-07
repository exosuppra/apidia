import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { Shield, LogOut, Users, FileText, Eye, Calendar, CalendarClock } from "lucide-react";

interface AdminSession {
  admin: {
    id: string;
    email: string;
  };
  sessionToken: string;
  loginTime: number;
}

export default function AdminDashboard() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const sessionData = localStorage.getItem("admin_session");
    if (!sessionData) {
      navigate("/admin/login");
      return;
    }

    try {
      const session = JSON.parse(sessionData) as AdminSession;
      
      // Vérifier si la session n'est pas trop ancienne (24h)
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      if (Date.now() - session.loginTime > maxAge) {
        localStorage.removeItem("admin_session");
        navigate("/admin/login");
        return;
      }

      setAdminSession(session);
    } catch (error) {
      localStorage.removeItem("admin_session");
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
    navigate("/admin/login");
  };

  if (!adminSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement...</div>
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
                  Connecté en tant que {adminSession.admin.email}
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
                <Button className="w-full mt-4" variant="outline">
                  Accéder
                </Button>
              </CardContent>
            </Card>

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
                <Button className="w-full mt-4" variant="outline">
                  Voir les demandes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Statistiques
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Voir les statistiques d'utilisation de la plateforme
                </CardDescription>
                <Button className="w-full mt-4" variant="outline">
                  Consulter
                </Button>
              </CardContent>
            </Card>

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