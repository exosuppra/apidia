import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, RefreshCw, Users, Eye, Clock, BarChart3, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { SiteStatsCard } from "@/components/stats/SiteStatsCard";
import { SiteStatsChart } from "@/components/stats/SiteStatsChart";
import { SiteComparisonChart } from "@/components/stats/SiteComparisonChart";

interface SiteData {
  name: string;
  data: Record<string, string>[];
  headers: string[];
}

interface StatsResponse {
  sites: SiteData[];
  message?: string;
}

export default function StatsWeb() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-stats-web", {
        method: "POST",
      });

      if (fnError) {
        throw new Error(fnError.message || "Erreur lors de la récupération des statistiques");
      }

      const response = data as StatsResponse;
      setSites(response.sites || []);
      
      if (response.sites?.length > 0) {
        toast({
          title: "Données chargées",
          description: `${response.sites.length} site(s) trouvé(s)`,
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

  // Helper to parse numeric values from strings
  const parseNumeric = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d.,\-]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // Calculate global KPIs
  const calculateGlobalKPIs = () => {
    let totalVisitors = 0;
    let totalPageViews = 0;
    let totalSessions = 0;

    sites.forEach((site) => {
      site.data.forEach((row) => {
        const visitors = parseNumeric(row["Utilisateurs"] || row["Visiteurs"] || row["Users"] || "0");
        const pageViews = parseNumeric(row["Pages vues"] || row["Vues"] || row["Page Views"] || row["Pageviews"] || "0");
        const sessions = parseNumeric(row["Sessions"] || row["Visites"] || "0");
        
        totalVisitors += visitors;
        totalPageViews += pageViews;
        totalSessions += sessions;
      });
    });

    return { totalVisitors, totalPageViews, totalSessions };
  };

  // Calculate site-specific KPIs
  const calculateSiteKPIs = (site: SiteData) => {
    let totalVisitors = 0;
    let totalPageViews = 0;
    let totalSessions = 0;
    let avgDuration = 0;
    let durationCount = 0;

    site.data.forEach((row) => {
      const visitors = parseNumeric(row["Utilisateurs"] || row["Visiteurs"] || row["Users"] || "0");
      const pageViews = parseNumeric(row["Pages vues"] || row["Vues"] || row["Page Views"] || row["Pageviews"] || "0");
      const sessions = parseNumeric(row["Sessions"] || row["Visites"] || "0");
      const duration = parseNumeric(row["Durée moyenne"] || row["Avg Duration"] || row["Durée"] || "0");
      
      totalVisitors += visitors;
      totalPageViews += pageViews;
      totalSessions += sessions;
      if (duration > 0) {
        avgDuration += duration;
        durationCount++;
      }
    });

    return {
      totalVisitors,
      totalPageViews,
      totalSessions,
      avgDuration: durationCount > 0 ? Math.round(avgDuration / durationCount) : 0,
    };
  };

  // Get chart data for a site
  const getChartData = (site: SiteData) => {
    const dateColumn = site.headers.find(h => 
      h.toLowerCase().includes("date") || 
      h.toLowerCase().includes("mois") || 
      h.toLowerCase().includes("période") ||
      h.toLowerCase().includes("month")
    ) || site.headers[0];

    const valueColumn = site.headers.find(h =>
      h.toLowerCase().includes("utilisateur") ||
      h.toLowerCase().includes("visiteur") ||
      h.toLowerCase().includes("user")
    ) || site.headers[1];

    return site.data.map((row) => ({
      label: row[dateColumn] || "",
      value: parseNumeric(row[valueColumn] || "0"),
    })).filter(d => d.label);
  };

  // Get comparison data across all sites
  const getComparisonData = () => {
    return sites.map((site) => {
      const kpis = calculateSiteKPIs(site);
      return {
        name: site.name,
        value: kpis.totalVisitors,
      };
    });
  };

  const globalKPIs = calculateGlobalKPIs();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Seo
        title="Statistiques Web | Administration"
        description="Tableau de bord des statistiques web multi-sites"
      />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Statistiques Web</h1>
            <p className="text-sm text-muted-foreground">
              Analyse des performances de {sites.length} site(s)
            </p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-destructive">{error}</p>
            <Button onClick={fetchStats}>Réessayer</Button>
          </CardContent>
        </Card>
      ) : sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune donnée disponible</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedSite} onValueChange={setSelectedSite} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Vue globale
            </TabsTrigger>
            {sites.map((site) => (
              <TabsTrigger key={site.name} value={site.name}>
                {site.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Global View */}
          <TabsContent value="all" className="space-y-6">
            {/* Global KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
              <SiteStatsCard
                title="Total Visiteurs"
                value={globalKPIs.totalVisitors.toLocaleString()}
                icon={<Users className="h-4 w-4" />}
              />
              <SiteStatsCard
                title="Total Pages Vues"
                value={globalKPIs.totalPageViews.toLocaleString()}
                icon={<Eye className="h-4 w-4" />}
              />
              <SiteStatsCard
                title="Total Sessions"
                value={globalKPIs.totalSessions.toLocaleString()}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>

            {/* Comparison Chart */}
            <SiteComparisonChart
              title="Comparaison des visiteurs par site"
              data={getComparisonData()}
            />

            {/* Sites Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => {
                const kpis = calculateSiteKPIs(site);
                return (
                  <Card key={site.name} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedSite(site.name)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{site.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Visiteurs</p>
                          <p className="font-semibold">{kpis.totalVisitors.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pages vues</p>
                          <p className="font-semibold">{kpis.totalPageViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sessions</p>
                          <p className="font-semibold">{kpis.totalSessions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Entrées</p>
                          <p className="font-semibold">{site.data.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Individual Site Views */}
          {sites.map((site) => {
            const kpis = calculateSiteKPIs(site);
            const chartData = getChartData(site);

            return (
              <TabsContent key={site.name} value={site.name} className="space-y-6">
                {/* Site KPIs */}
                <div className="grid gap-4 md:grid-cols-4">
                  <SiteStatsCard
                    title="Visiteurs"
                    value={kpis.totalVisitors.toLocaleString()}
                    icon={<Users className="h-4 w-4" />}
                  />
                  <SiteStatsCard
                    title="Pages Vues"
                    value={kpis.totalPageViews.toLocaleString()}
                    icon={<Eye className="h-4 w-4" />}
                  />
                  <SiteStatsCard
                    title="Sessions"
                    value={kpis.totalSessions.toLocaleString()}
                    icon={<Clock className="h-4 w-4" />}
                  />
                  <SiteStatsCard
                    title="Durée Moyenne"
                    value={kpis.avgDuration > 0 ? `${kpis.avgDuration}s` : "N/A"}
                    icon={<Clock className="h-4 w-4" />}
                  />
                </div>

                {/* Evolution Chart */}
                {chartData.length > 1 && (
                  <SiteStatsChart
                    title="Évolution des visiteurs"
                    data={chartData}
                  />
                )}

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Données détaillées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {site.headers.map((header, idx) => (
                              <TableHead key={idx}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {site.data.map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                              {site.headers.map((header, cellIdx) => (
                                <TableCell key={cellIdx}>{row[header] || "-"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
