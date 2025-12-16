import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Star, MessageSquare, TrendingUp, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { SiteStatsCard } from "@/components/stats/SiteStatsCard";
import { SiteStatsChart } from "@/components/stats/SiteStatsChart";
import { SiteComparisonChart } from "@/components/stats/SiteComparisonChart";

interface EstablishmentEntry {
  date: string;
  reviews: number;
  rating: number;
}

interface EstablishmentData {
  name: string;
  data: EstablishmentEntry[];
}

interface StatsResponse {
  establishments: EstablishmentData[];
  message?: string;
}

export default function StatsEreputation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [establishments, setEstablishments] = useState<EstablishmentData[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>("all");

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-stats-ereputation", {
        method: "POST",
      });

      if (fnError) {
        throw new Error(fnError.message || "Erreur lors de la récupération des statistiques");
      }

      const response = data as StatsResponse;
      setEstablishments(response.establishments || []);
      
      if (response.establishments?.length > 0) {
        toast({
          title: "Données chargées",
          description: `${response.establishments.length} établissement(s) trouvé(s)`,
        });
      } else {
        toast({
          title: "Aucune donnée",
          description: response.message || "Aucune statistique disponible",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Erreur fetch stats:", err);
      setError(err.message || "Erreur inconnue");
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

  // Calculate KPIs
  const calculateKPIs = (data: EstablishmentData[]) => {
    let totalReviews = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    data.forEach((establishment) => {
      establishment.data.forEach((entry) => {
        if (entry.reviews > 0) {
          totalReviews += entry.reviews;
        }
        if (entry.rating > 0) {
          totalRatings += entry.rating;
          ratingCount++;
        }
      });
    });

    return {
      totalReviews,
      avgRating: ratingCount > 0 ? Math.round(totalRatings / ratingCount * 100) / 100 : 0,
      establishmentCount: data.length,
    };
  };

  // Get filtered data based on selection
  const filteredEstablishments = useMemo(() => {
    if (selectedEstablishment === "all") {
      return establishments;
    }
    return establishments.filter(e => e.name === selectedEstablishment);
  }, [establishments, selectedEstablishment]);

  const globalKPIs = useMemo(() => calculateKPIs(filteredEstablishments), [filteredEstablishments]);

  // Chart data for rating evolution
  const getChartData = (establishment: EstablishmentData) => {
    return establishment.data
      .filter(entry => entry.date && entry.rating > 0)
      .map(entry => ({
        label: entry.date,
        value: entry.rating,
      }));
  };

  // Comparison data across establishments
  const comparisonData = useMemo(() => {
    return establishments.map(e => {
      const kpis = calculateKPIs([e]);
      return {
        name: e.name.replace("BIT de ", "").replace("BIT ", ""),
        value: kpis.avgRating,
      };
    }).filter(d => d.value > 0);
  }, [establishments]);

  const reviewsComparisonData = useMemo(() => {
    return establishments.map(e => {
      const kpis = calculateKPIs([e]);
      return {
        name: e.name.replace("BIT de ", "").replace("BIT ", ""),
        value: kpis.totalReviews,
      };
    }).filter(d => d.value > 0);
  }, [establishments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchStats}>Réessayer</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Statistiques E-réputation"
        description="Statistiques des fiches établissements Google"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Statistiques E-réputation</h1>
                <p className="text-sm text-muted-foreground">
                  Suivi des avis Google par établissement
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tous les établissements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les établissements</SelectItem>
                  {establishments.map((e) => (
                    <SelectItem key={e.name} value={e.name}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={fetchStats} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Global KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SiteStatsCard
              title="Note moyenne"
              value={`${globalKPIs.avgRating.toFixed(2)} / 5`}
              icon={<Star className="h-4 w-4 text-yellow-500" />}
              tooltip="Note moyenne sur l'ensemble des établissements sélectionnés"
            />
            <SiteStatsCard
              title="Total avis"
              value={globalKPIs.totalReviews.toLocaleString("fr-FR")}
              icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
              tooltip="Nombre total d'avis reçus"
            />
            <SiteStatsCard
              title="Établissements"
              value={globalKPIs.establishmentCount.toString()}
              icon={<Building2 className="h-4 w-4 text-green-500" />}
              tooltip="Nombre d'établissements suivis"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="comparison">Comparaison</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {filteredEstablishments.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Aucune donnée disponible
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredEstablishments.map((establishment) => {
                    const chartData = getChartData(establishment);
                    if (chartData.length === 0) return null;
                    
                    return (
                      <SiteStatsChart
                        key={establishment.name}
                        title={`Évolution notes - ${establishment.name}`}
                        data={chartData}
                        color="hsl(var(--primary))"
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {comparisonData.length > 0 && (
                  <SiteComparisonChart
                    title="Note moyenne par établissement"
                    data={comparisonData}
                    color="hsl(var(--primary))"
                  />
                )}
                {reviewsComparisonData.length > 0 && (
                  <SiteComparisonChart
                    title="Nombre d'avis par établissement"
                    data={reviewsComparisonData}
                    color="hsl(48, 96%, 53%)"
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {filteredEstablishments.map((establishment) => {
                const kpis = calculateKPIs([establishment]);
                
                return (
                  <Card key={establishment.name}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {establishment.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{kpis.avgRating.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Note moyenne</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{kpis.totalReviews}</p>
                          <p className="text-sm text-muted-foreground">Total avis</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{establishment.data.length}</p>
                          <p className="text-sm text-muted-foreground">Entrées</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">
                            {establishment.data.filter(d => d.date).length > 0 
                              ? establishment.data.filter(d => d.date)[establishment.data.filter(d => d.date).length - 1]?.date || "-"
                              : "-"
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">Dernière entrée</p>
                        </div>
                      </div>
                      
                      {/* Recent entries table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Date</th>
                              <th className="text-right py-2 px-4">Avis</th>
                              <th className="text-right py-2 px-4">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {establishment.data.slice(-10).reverse().map((entry, idx) => (
                              <tr key={idx} className="border-b border-muted">
                                <td className="py-2 px-4">{entry.date || "-"}</td>
                                <td className="text-right py-2 px-4">{entry.reviews || "-"}</td>
                                <td className="text-right py-2 px-4">
                                  {entry.rating ? (
                                    <span className="flex items-center justify-end gap-1">
                                      {entry.rating}
                                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    </span>
                                  ) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
