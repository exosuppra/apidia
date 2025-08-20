import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface FicheData {
  sheetName: string;
  data: Record<string, string>;
}

export default function AllFiches() {
  const [fiches, setFiches] = useState<FicheData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadAllFiches = async () => {
    setLoading(true);
    try {
      console.log("Calling list-all-fiches function...");
      const { data, error } = await supabase.functions.invoke('list-all-fiches', {
        body: {}
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      
      console.log("Function response:", data);
      setFiches(data.data || []);
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

  useEffect(() => {
    loadAllFiches();
  }, []);

  return (
    <>
      <Seo 
        title="Toutes les fiches - Administration"
        description="Vue d'ensemble de toutes les fiches du Google Sheet"
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
                <h1 className="text-2xl font-bold">Toutes les fiches</h1>
                <p className="text-sm text-muted-foreground">
                  Vue d'ensemble des données du Google Sheet
                </p>
              </div>
            </div>
            
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

          {/* Fiches Display */}
          <Card>
            <CardHeader>
              <CardTitle>
                {loading ? "Chargement..." : `Fiches trouvées (${fiches.length})`}
              </CardTitle>
              <CardDescription>
                Données du Google Sheet (exclut les feuilles contenant "SOURCING")
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement des fiches...</span>
                </div>
              ) : fiches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
        </div>
      </div>
    </>
  );
}