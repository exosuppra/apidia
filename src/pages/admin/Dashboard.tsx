import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { Shield, LogOut, Users, FileText, Eye, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface AdminSession {
  admin: {
    id: string;
    email: string;
  };
  sessionToken: string;
  loginTime: number;
}

interface FicheData {
  sheetName: string;
  data: Record<string, string>;
}

export default function AdminDashboard() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [fiches, setFiches] = useState<FicheData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFiches, setShowFiches] = useState(false);
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

  const loadAllFiches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-all-fiches', {
        body: {}
      });

      if (error) throw error;
      
      setFiches(data.data || []);
      setShowFiches(true);
      toast({
        title: "Fiches chargées",
        description: `${data.data?.length || 0} fiches trouvées`,
      });
    } catch (error: any) {
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
                  onClick={loadAllFiches}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger toutes les fiches'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Fiches Display */}
          {showFiches && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Toutes les fiches ({fiches.length})</CardTitle>
                <CardDescription>
                  Fiches du Google Sheet (exclut les feuilles contenant "SOURCING")
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fiches.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aucune fiche trouvée
                  </div>
                ) : (
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feuille</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Autres données</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fiches.map((fiche, index) => {
                          const email = fiche.data.email || fiche.data["e-mail"] || fiche.data.mail || "";
                          const nom = fiche.data.nom || fiche.data.name || fiche.data.nomcomplet || "";
                          const otherFields = Object.entries(fiche.data)
                            .filter(([key]) => !["feuille", "email", "e-mail", "mail", "nom", "name", "nomcomplet"].includes(key.toLowerCase()))
                            .filter(([, value]) => value && value.trim() !== "")
                            .slice(0, 3); // Limiter à 3 champs supplémentaires

                          return (
                            <TableRow key={`${fiche.sheetName}-${index}`}>
                              <TableCell className="font-medium">
                                {fiche.sheetName}
                              </TableCell>
                              <TableCell>{email}</TableCell>
                              <TableCell>{nom}</TableCell>
                              <TableCell>
                                {otherFields.length > 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    {otherFields.map(([key, value]) => (
                                      <div key={key}>
                                        <strong>{key}:</strong> {value.length > 30 ? `${value.substring(0, 30)}...` : value}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
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
          )}

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