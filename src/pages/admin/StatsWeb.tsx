import { useEffect, useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, RefreshCw, Users, Eye, Clock, BarChart3, Globe, CalendarIcon, Filter, Download, UserPlus, Target, FileText, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { SiteStatsCard } from "@/components/stats/SiteStatsCard";
import { SiteStatsChart } from "@/components/stats/SiteStatsChart";
import { SiteComparisonChart } from "@/components/stats/SiteComparisonChart";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// KPI definitions with descriptions
const KPI_DEFINITIONS = {
  utilisateursActifs: {
    title: "Utilisateurs actifs",
    description: "Nombre total d'utilisateurs uniques ayant visité le(s) site(s) pendant la période sélectionnée.",
  },
  nouveauxUtilisateurs: {
    title: "Nouveaux utilisateurs",
    description: "Nombre d'utilisateurs visitant le(s) site(s) pour la première fois.",
  },
  pagesVues: {
    title: "Pages vues",
    description: "Nombre total de pages consultées, incluant les rechargements et les pages vues plusieurs fois.",
  },
  tauxEngagement: {
    title: "Taux d'engagement",
    description: "Pourcentage de sessions où l'utilisateur a interagi activement (clic, scroll, navigation, etc.).",
  },
  pagesSession: {
    title: "Pages / Session",
    description: "Nombre moyen de pages consultées par session. Un indicateur de l'intérêt des visiteurs.",
  },
  dureeMoyenne: {
    title: "Durée moyenne",
    description: "Temps moyen passé par session sur le(s) site(s). Format: minutes:secondes.",
  },
  tauxRetention: {
    title: "Taux de rétention",
    description: "Pourcentage de visiteurs qui reviennent sur le site (utilisateurs actifs - nouveaux utilisateurs).",
  },
};

interface SiteData {
  name: string;
  data: Record<string, string>[];
  headers: string[];
}

interface StatsResponse {
  sites: SiteData[];
  message?: string;
}

type PeriodType = "all" | "last_month" | "semester_1" | "semester_2" | "custom";
type MetricType = "visitors" | "pageviews" | "newUsers" | "engagement";

// French month names for parsing
const frenchMonths: Record<string, number> = {
  "janvier": 0, "février": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
  "juillet": 6, "août": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11,
  "jan": 0, "fév": 1, "mar": 2, "avr": 3, "jui": 5, "juil": 6, "aoû": 7, "sep": 8, "oct": 9, "nov": 10, "déc": 11
};

export default function StatsWeb() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("visitors");

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

  // Get date range based on period filter
  const getDateRange = (): { start: Date; end: Date } | null => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (periodFilter) {
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "semester_1":
        return { 
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 5, 30)
        };
      case "semester_2":
        return { 
          start: new Date(currentYear, 6, 1),
          end: new Date(currentYear, 11, 31)
        };
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return { start: customDateRange.from, end: customDateRange.to };
        }
        return null;
      default:
        return null;
    }
  };

  // Get previous period range for trend calculation
  const getPreviousPeriodRange = (): { start: Date; end: Date } | null => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (periodFilter) {
      case "last_month":
        const twoMonthsAgo = subMonths(now, 2);
        return { start: startOfMonth(twoMonthsAgo), end: endOfMonth(twoMonthsAgo) };
      case "semester_1":
        return { 
          start: new Date(currentYear - 1, 6, 1),
          end: new Date(currentYear - 1, 11, 31)
        };
      case "semester_2":
        return { 
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 5, 30)
        };
      default:
        return null;
    }
  };

  // Improved date parsing for French formats
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    const cleaned = dateStr.trim().toLowerCase();
    
    // Try "janvier 2025" or "Janvier 2025" format
    const frenchMonthYearRegex = /^([a-zéûà]+)\s*(\d{4})$/i;
    const frenchMatch = cleaned.match(frenchMonthYearRegex);
    if (frenchMatch) {
      const monthName = frenchMatch[1].toLowerCase();
      const year = parseInt(frenchMatch[2]);
      const monthIndex = frenchMonths[monthName];
      if (monthIndex !== undefined) {
        return new Date(year, monthIndex, 1);
      }
    }
    
    // Try "01/2025" or "1/2025" format
    const monthYearSlashRegex = /^(\d{1,2})\/(\d{4})$/;
    const slashMatch = cleaned.match(monthYearSlashRegex);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const year = parseInt(slashMatch[2]);
      return new Date(year, month, 1);
    }

    // Try "2025-01" format
    const isoMonthRegex = /^(\d{4})-(\d{1,2})$/;
    const isoMatch = cleaned.match(isoMonthRegex);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      return new Date(year, month, 1);
    }
    
    // Standard date-fns formats
    const formats = [
      "dd/MM/yyyy",
      "MM/yyyy",
      "yyyy-MM-dd",
      "dd-MM-yyyy",
      "MMMM yyyy",
      "MMM yyyy",
    ];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date(), { locale: fr });
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
    
    // Native Date parsing as fallback
    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate;
    }
    
    return null;
  };

  // Filter data by date range
  const filterDataByPeriod = (data: Record<string, string>[], headers: string[], dateRange: { start: Date; end: Date } | null): Record<string, string>[] => {
    if (!dateRange) return data;

    const dateColumn = headers.find(h => 
      h.toLowerCase().includes("date") || 
      h.toLowerCase().includes("mois") || 
      h.toLowerCase().includes("période") ||
      h.toLowerCase().includes("periode") ||
      h.toLowerCase().includes("month")
    ) || headers[0];

    return data.filter(row => {
      const dateStr = row[dateColumn];
      const rowDate = parseDate(dateStr);
      
      if (!rowDate) return true;
      
      return isWithinInterval(rowDate, { start: dateRange.start, end: dateRange.end });
    });
  };

  // Filtered sites data for current period
  const filteredSites = useMemo(() => {
    const dateRange = getDateRange();
    return sites.map(site => ({
      ...site,
      data: filterDataByPeriod(site.data, site.headers, dateRange),
    }));
  }, [sites, periodFilter, customDateRange]);

  // Filtered sites data for previous period (for trends)
  const previousPeriodSites = useMemo(() => {
    const dateRange = getPreviousPeriodRange();
    if (!dateRange) return null;
    return sites.map(site => ({
      ...site,
      data: filterDataByPeriod(site.data, site.headers, dateRange),
    }));
  }, [sites, periodFilter]);

  // Helper to parse numeric values - handles French format (space as thousands, comma as decimal)
  const parseNumeric = (value: string): number => {
    if (!value) return 0;
    // Remove all spaces (including non-breaking spaces used as thousands separator)
    let cleaned = value.replace(/[\s\u00A0]/g, "");
    // Replace comma with dot for decimal
    cleaned = cleaned.replace(",", ".");
    // Remove any remaining non-numeric characters except dot and minus
    cleaned = cleaned.replace(/[^\d.\-]/g, "");
    return parseFloat(cleaned) || 0;
  };

  // Parse duration string - handles multiple formats:
  // "1:39", "01:27" (mm:ss), "0:01:23" (hh:mm:ss), "1 minute 32 secondes", "1m 23s"
  const parseDuration = (value: string): number => {
    if (!value) return 0;
    
    const trimmed = value.trim();
    
    // Format "X minute(s) Y seconde(s)" - French text format
    const frenchMinSecMatch = trimmed.match(/(\d+)\s*minutes?\s*(?:(\d+)\s*secondes?)?/i);
    if (frenchMinSecMatch) {
      const mins = parseInt(frenchMinSecMatch[1]) || 0;
      const secs = parseInt(frenchMinSecMatch[2]) || 0;
      return mins * 60 + secs;
    }
    
    // Format "X seconde(s)" only
    const frenchSecMatch = trimmed.match(/^(\d+)\s*secondes?$/i);
    if (frenchSecMatch) {
      return parseInt(frenchSecMatch[1]) || 0;
    }
    
    // Format "Xm Ys" or "Xmin Ys"
    const minSecMatch = trimmed.match(/(\d+)\s*m(?:in)?\s*(\d+)?\s*s?/i);
    if (minSecMatch) {
      const mins = parseInt(minSecMatch[1]) || 0;
      const secs = parseInt(minSecMatch[2]) || 0;
      return mins * 60 + secs;
    }
    
    // Format with colons (mm:ss or hh:mm:ss)
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map(p => parseInt(p.trim()) || 0);
      if (parts.length === 3) {
        // hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // mm:ss
        return parts[0] * 60 + parts[1];
      }
    }
    
    // Just a number (assume seconds)
    return parseNumeric(trimmed);
  };

  // Format seconds to mm:ss consistently
  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format large numbers with French locale (space as thousands separator)
  const formatNumber = (num: number): string => {
    return num.toLocaleString("fr-FR");
  };

  // Parse percentage string like "65.5%" or "65,5%" to number
  const parsePercentage = (value: string): number => {
    if (!value) return 0;
    // Remove spaces and %
    let cleaned = value.replace(/[\s\u00A0%]/g, "");
    // Replace comma with dot
    cleaned = cleaned.replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // Get value from row with multiple possible column names
  const getRowValue = (row: Record<string, string>, ...possibleNames: string[]): string => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== "") return row[name];
    }
    return "";
  };

  // Calculate KPIs for a dataset
  const calculateKPIs = (siteData: SiteData[]) => {
    let totalVisitors = 0;
    let totalPageViews = 0;
    let totalNewUsers = 0;
    let totalEngagement = 0;
    let totalPagesPerSession = 0;
    let totalDuration = 0;
    let engagementCount = 0;
    let pagesPerSessionCount = 0;
    let durationCount = 0;

    siteData.forEach((site) => {
      site.data.forEach((row) => {
        // Updated column mapping based on actual Google Sheets headers
        const visitors = parseNumeric(getRowValue(row, "Utilisateurs actifs", "Utilisateurs", "Visiteurs", "Users", "Total Nbr Utilisateur"));
        const pageViews = parseNumeric(getRowValue(row, "Pages vues", "Vues", "Page Views", "Pageviews", "Nbr total de pages vues"));
        const newUsers = parseNumeric(getRowValue(row, "Nouveaux utilisateurs", "Nouveaux", "New Users"));
        const engagement = parsePercentage(getRowValue(row, "Taux d'engagement", "Engagement", "Engagement Rate"));
        const pagesPerSession = parseNumeric(getRowValue(row, "Pages/Session", "Pages par session", "Pages/Sess"));
        const duration = parseDuration(getRowValue(row, "Durée moyenne session", "Durée moyenne", "Avg Duration", "Durée", "Moyenne durée"));
        
        totalVisitors += visitors;
        totalPageViews += pageViews;
        totalNewUsers += newUsers;
        
        if (engagement > 0) {
          totalEngagement += engagement;
          engagementCount++;
        }
        if (pagesPerSession > 0) {
          totalPagesPerSession += pagesPerSession;
          pagesPerSessionCount++;
        }
        if (duration > 0) {
          totalDuration += duration;
          durationCount++;
        }
      });
    });

    return {
      totalVisitors,
      totalPageViews,
      totalNewUsers,
      avgEngagement: engagementCount > 0 ? Math.round(totalEngagement / engagementCount * 10) / 10 : 0,
      avgPagesPerSession: pagesPerSessionCount > 0 ? Math.round(totalPagesPerSession / pagesPerSessionCount * 100) / 100 : 0,
      avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      retention: totalVisitors > 0 ? Math.round((totalVisitors - totalNewUsers) / totalVisitors * 100) : 0,
    };
  };

  // Calculate trend percentage
  const calculateTrend = (current: number, previous: number): number | undefined => {
    if (previous === 0 || !previousPeriodSites) return undefined;
    return Math.round((current - previous) / previous * 100);
  };

  // Calculate global KPIs
  const calculateGlobalKPIs = () => {
    const current = calculateKPIs(filteredSites);
    const previous = previousPeriodSites ? calculateKPIs(previousPeriodSites) : null;

    return {
      ...current,
      trends: previous ? {
        visitors: calculateTrend(current.totalVisitors, previous.totalVisitors),
        pageViews: calculateTrend(current.totalPageViews, previous.totalPageViews),
        newUsers: calculateTrend(current.totalNewUsers, previous.totalNewUsers),
        engagement: calculateTrend(current.avgEngagement, previous.avgEngagement),
      } : undefined,
    };
  };

  // Calculate site-specific KPIs
  const calculateSiteKPIs = (site: SiteData) => {
    const current = calculateKPIs([site]);
    
    // Find the same site in previous period data
    const previousSite = previousPeriodSites?.find(s => s.name === site.name);
    const previous = previousSite ? calculateKPIs([previousSite]) : null;

    return {
      ...current,
      trends: previous ? {
        visitors: calculateTrend(current.totalVisitors, previous.totalVisitors),
        pageViews: calculateTrend(current.totalPageViews, previous.totalPageViews),
        newUsers: calculateTrend(current.totalNewUsers, previous.totalNewUsers),
        engagement: calculateTrend(current.avgEngagement, previous.avgEngagement),
      } : undefined,
    };
  };

  // Get chart data for a site with selected metric
  const getChartData = (site: SiteData, metric: MetricType = "visitors") => {
    const dateColumn = site.headers.find(h => 
      h.toLowerCase().includes("date") || 
      h.toLowerCase().includes("mois") || 
      h.toLowerCase().includes("période") ||
      h.toLowerCase().includes("periode") ||
      h.toLowerCase().includes("month")
    ) || site.headers[0];

    return site.data.map((row) => {
      let value = 0;
      switch (metric) {
        case "visitors":
          value = parseNumeric(getRowValue(row, "Utilisateurs actifs", "Utilisateurs", "Visiteurs", "Users"));
          break;
        case "pageviews":
          value = parseNumeric(getRowValue(row, "Pages vues", "Vues", "Page Views"));
          break;
        case "newUsers":
          value = parseNumeric(getRowValue(row, "Nouveaux utilisateurs", "Nouveaux", "New Users"));
          break;
        case "engagement":
          value = parsePercentage(getRowValue(row, "Taux d'engagement", "Engagement"));
          break;
      }
      return {
        label: row[dateColumn] || "",
        value,
      };
    }).filter(d => d.label);
  };

  // Get comparison data across all sites
  const getComparisonData = (metric: MetricType = "visitors") => {
    return filteredSites.map((site) => {
      const kpis = calculateSiteKPIs(site);
      let value = 0;
      switch (metric) {
        case "visitors":
          value = kpis.totalVisitors;
          break;
        case "pageviews":
          value = kpis.totalPageViews;
          break;
        case "newUsers":
          value = kpis.totalNewUsers;
          break;
        case "engagement":
          value = kpis.avgEngagement;
          break;
      }
      return {
        name: site.name,
        value,
      };
    });
  };

  // Export data to CSV
  const exportToCSV = () => {
    const dataToExport = selectedSite === "all" ? filteredSites : filteredSites.filter(s => s.name === selectedSite);
    
    let csv = "";
    dataToExport.forEach(site => {
      csv += `\n${site.name}\n`;
      csv += site.headers.join(";") + "\n";
      site.data.forEach(row => {
        csv += site.headers.map(h => row[h] || "").join(";") + "\n";
      });
    });
    
    // Add summary
    csv += "\n\nRésumé\n";
    csv += "Site;Visiteurs;Pages vues;Nouveaux utilisateurs;Taux engagement;Durée moyenne\n";
    dataToExport.forEach(site => {
      const kpis = calculateSiteKPIs(site);
      csv += `${site.name};${kpis.totalVisitors};${kpis.totalPageViews};${kpis.totalNewUsers};${kpis.avgEngagement}%;${formatDuration(kpis.avgDuration)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stats-web-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé",
    });
  };

  const globalKPIs = calculateGlobalKPIs();

  // Get last month name
  const lastMonthDate = subMonths(new Date(), 1);
  const lastMonthName = format(lastMonthDate, "MMMM yyyy", { locale: fr });
  const currentYear = new Date().getFullYear();

  const periodOptions = [
    { value: "all", label: "Toutes les périodes" },
    { value: "last_month", label: `${lastMonthName.charAt(0).toUpperCase() + lastMonthName.slice(1)}` },
    { value: "semester_1", label: `Semestre 1 (${currentYear})` },
    { value: "semester_2", label: `Semestre 2 (${currentYear})` },
    { value: "custom", label: "Période personnalisée" },
  ];

  const metricOptions = [
    { value: "visitors", label: "Utilisateurs actifs", icon: Users },
    { value: "pageviews", label: "Pages vues", icon: Eye },
    { value: "newUsers", label: "Nouveaux utilisateurs", icon: UserPlus },
    { value: "engagement", label: "Taux d'engagement", icon: Target },
  ];

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
              Analyse des performances de {filteredSites.length} site(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Button onClick={fetchStats} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrer par période :</span>
          </div>
          
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {periodFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customDateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.from ? format(customDateRange.from, "dd/MM/yyyy") : "Du"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">→</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customDateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.to ? format(customDateRange.to, "dd/MM/yyyy") : "Au"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {periodFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setPeriodFilter("all")}>
              Réinitialiser
            </Button>
          )}
        </CardContent>
      </Card>

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
            {filteredSites.map((site) => (
              <TabsTrigger key={site.name} value={site.name}>
                {site.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Global View */}
          <TabsContent value="all" className="space-y-6">
            {/* Global KPIs - Row 1 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SiteStatsCard
                title="Utilisateurs actifs"
                value={formatNumber(globalKPIs.totalVisitors)}
                trend={globalKPIs.trends?.visitors}
                icon={<Users className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.utilisateursActifs.description}
              />
              <SiteStatsCard
                title="Nouveaux utilisateurs"
                value={formatNumber(globalKPIs.totalNewUsers)}
                trend={globalKPIs.trends?.newUsers}
                icon={<UserPlus className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.nouveauxUtilisateurs.description}
              />
              <SiteStatsCard
                title="Pages vues"
                value={formatNumber(globalKPIs.totalPageViews)}
                trend={globalKPIs.trends?.pageViews}
                icon={<Eye className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.pagesVues.description}
              />
              <SiteStatsCard
                title="Taux d'engagement"
                value={`${globalKPIs.avgEngagement}%`}
                trend={globalKPIs.trends?.engagement}
                icon={<Target className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.tauxEngagement.description}
              />
            </div>

            {/* Global KPIs - Row 2 */}
            <div className="grid gap-4 md:grid-cols-3">
              <SiteStatsCard
                title="Pages / Session"
                value={globalKPIs.avgPagesPerSession.toFixed(2)}
                icon={<FileText className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.pagesSession.description}
              />
              <SiteStatsCard
                title="Durée moyenne"
                value={formatDuration(globalKPIs.avgDuration)}
                icon={<Clock className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.dureeMoyenne.description}
              />
              <SiteStatsCard
                title="Taux de rétention"
                value={`${globalKPIs.retention}%`}
                icon={<Users className="h-4 w-4" />}
                tooltip={KPI_DEFINITIONS.tauxRetention.description}
              />
            </div>

            {/* Metric Selector for Chart */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Comparaison par site</CardTitle>
                <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <SiteComparisonChart
                  title=""
                  data={getComparisonData(selectedMetric)}
                />
              </CardContent>
            </Card>

            {/* Sites Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => {
                const kpis = calculateSiteKPIs(site);
                const rank = getComparisonData("visitors")
                  .sort((a, b) => b.value - a.value)
                  .findIndex(s => s.name === site.name) + 1;
                const rankBadge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
                
                return (
                  <Card key={site.name} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedSite(site.name)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {rankBadge && <span>{rankBadge}</span>}
                        {site.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Utilisateurs</p>
                          <p className="font-semibold">{formatNumber(kpis.totalVisitors)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pages vues</p>
                          <p className="font-semibold">{formatNumber(kpis.totalPageViews)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Engagement</p>
                          <p className="font-semibold">{kpis.avgEngagement}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Durée moy.</p>
                          <p className="font-semibold">{formatDuration(kpis.avgDuration)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Individual Site Views */}
          {filteredSites.map((site) => {
            const kpis = calculateSiteKPIs(site);

            return (
              <TabsContent key={site.name} value={site.name} className="space-y-6">
                {/* Site KPIs - Row 1 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SiteStatsCard
                    title="Utilisateurs actifs"
                    value={formatNumber(kpis.totalVisitors)}
                    trend={kpis.trends?.visitors}
                    icon={<Users className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.utilisateursActifs.description}
                  />
                  <SiteStatsCard
                    title="Nouveaux utilisateurs"
                    value={formatNumber(kpis.totalNewUsers)}
                    trend={kpis.trends?.newUsers}
                    icon={<UserPlus className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.nouveauxUtilisateurs.description}
                  />
                  <SiteStatsCard
                    title="Pages vues"
                    value={formatNumber(kpis.totalPageViews)}
                    trend={kpis.trends?.pageViews}
                    icon={<Eye className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.pagesVues.description}
                  />
                  <SiteStatsCard
                    title="Taux d'engagement"
                    value={`${kpis.avgEngagement}%`}
                    trend={kpis.trends?.engagement}
                    icon={<Target className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.tauxEngagement.description}
                  />
                </div>

                {/* Site KPIs - Row 2 */}
                <div className="grid gap-4 md:grid-cols-3">
                  <SiteStatsCard
                    title="Pages / Session"
                    value={kpis.avgPagesPerSession.toFixed(2)}
                    icon={<FileText className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.pagesSession.description}
                  />
                  <SiteStatsCard
                    title="Durée moyenne"
                    value={formatDuration(kpis.avgDuration)}
                    icon={<Clock className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.dureeMoyenne.description}
                  />
                  <SiteStatsCard
                    title="Taux de rétention"
                    value={`${kpis.retention}%`}
                    icon={<Users className="h-4 w-4" />}
                    tooltip={KPI_DEFINITIONS.tauxRetention.description}
                  />
                </div>

                {/* Evolution Chart with Metric Selector */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Évolution</CardTitle>
                    <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metricOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {getChartData(site, selectedMetric).length > 1 ? (
                      <SiteStatsChart
                        title=""
                        data={getChartData(site, selectedMetric)}
                      />
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Pas assez de données pour afficher le graphique
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Données détaillées ({site.data.length} entrées)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {site.data.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune donnée pour cette période
                      </p>
                    ) : (
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
                                {site.headers.map((header, cellIdx) => {
                                  const value = row[header] || "-";
                                  // Format duration columns
                                  const isDurationColumn = header.toLowerCase().includes("durée") || 
                                    header.toLowerCase().includes("duration") ||
                                    header.toLowerCase().includes("moyenne session");
                                  if (isDurationColumn && value !== "-") {
                                    const seconds = parseDuration(value);
                                    return <TableCell key={cellIdx}>{formatDuration(seconds)}</TableCell>;
                                  }
                                  return <TableCell key={cellIdx}>{value}</TableCell>;
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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
