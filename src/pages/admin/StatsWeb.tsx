import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { ArrowLeft, BarChart3, RefreshCw, Table } from "lucide-react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StatsData {
  data: Record<string, string>[];
  headers: string[];
  sheetName: string;
  message?: string;
}

export default function StatsWeb() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-stats-web', {
        method: 'POST',
      });

      if (fnError) throw fnError;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setStats(data);
      
      if (data.message) {
        toast({
          title: "Information",
          description: data.message,
        });
      }
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      setError(err.message || "Erreur lors du chargement des statistiques");
      toast({
        title: "Erreur",
        description: err.message || "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <>
      <Seo 
        title="Statistiques Web"
        description="Statistiques des projets web"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/admin/dashboard")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Statistiques Web</h1>
                <p className="text-sm text-muted-foreground">
                  Données importées du Google Sheet
                </p>
              </div>
            </div>
            
            <Button 
              onClick={fetchStats} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchStats} className="mt-4" variant="outline">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : stats && stats.data.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  <CardTitle>Données du tableau</CardTitle>
                </div>
                <CardDescription>
                  {stats.data.length} entrée(s) trouvée(s) 
                  {stats.sheetName && ` dans l'onglet "${stats.sheetName}"`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        {stats.headers.map((header, idx) => (
                          <TableHead key={idx}>{header || `Col ${idx + 1}`}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.data.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {stats.headers.map((header, cellIdx) => (
                            <TableCell key={cellIdx}>
                              {row[header] || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune donnée trouvée</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
