import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft,
  Clock,
  Briefcase,
  TrendingUp,
  Building2,
  Home,
  Loader2,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface RHEntry {
  date: string;
  projet: string;
  tache: string;
  titre: string;
  heures_recherche_ot: number;
  heures_recherche_maison: number;
  temps_travail: string;
  valorisation: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

const ITEMS_PER_PAGE = 20;

export default function SuiviRH() {
  const navigate = useNavigate();
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [projetFilter, setProjetFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: rhData, isLoading, error } = useQuery({
    queryKey: ["rh-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-rh-data", {
        body: {},
      });
      if (error) throw error;
      return data.data as RHEntry[];
    },
  });

  // Get unique projects for filter
  const projets = useMemo(() => {
    if (!rhData) return [];
    const uniqueProjets = [...new Set(rhData.map((e) => e.projet).filter(Boolean))];
    return uniqueProjets.sort();
  }, [rhData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!rhData) return [];
    return rhData.filter((entry) => {
      // Filter by project
      if (projetFilter !== "all" && entry.projet !== projetFilter) return false;
      
      // Filter by date range (basic string comparison)
      if (dateStart && entry.date && entry.date < dateStart) return false;
      if (dateEnd && entry.date && entry.date > dateEnd) return false;
      
      return true;
    });
  }, [rhData, projetFilter, dateStart, dateEnd]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalHeuresOT = filteredData.reduce((sum, e) => sum + e.heures_recherche_ot, 0);
    const totalHeuresMaison = filteredData.reduce((sum, e) => sum + e.heures_recherche_maison, 0);
    const totalValorisation = filteredData.reduce((sum, e) => sum + e.valorisation, 0);
    const uniqueProjets = new Set(filteredData.map((e) => e.projet).filter(Boolean)).size;
    
    return {
      totalHeures: totalHeuresOT + totalHeuresMaison,
      totalHeuresOT,
      totalHeuresMaison,
      totalValorisation,
      nbProjets: uniqueProjets,
    };
  }, [filteredData]);

  // Data for charts
  const heuresParProjet = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((e) => {
      if (e.projet) {
        const heures = e.heures_recherche_ot + e.heures_recherche_maison;
        grouped[e.projet] = (grouped[e.projet] || 0) + heures;
      }
    });
    return Object.entries(grouped)
      .map(([name, heures]) => ({ name, heures: Math.round(heures * 10) / 10 }))
      .filter((d) => d.heures > 0)
      .sort((a, b) => b.heures - a.heures)
      .slice(0, 10);
  }, [filteredData]);

  const repartitionOTMaison = useMemo(() => {
    return [
      { name: "Recherche OT", value: kpis.totalHeuresOT },
      { name: "Recherche Maison", value: kpis.totalHeuresMaison },
    ].filter((d) => d.value > 0);
  }, [kpis]);

  // Parse French date like "10 juin 2025" to Date object
  const parseFrenchDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const months: Record<string, number> = {
      janvier: 0, fevrier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, 
      decembre: 11, décembre: 11
    };
    // Normalize accents for matching
    const normalizedStr = dateStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    const matchNormalized = normalizedStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    
    if (match) {
      const day = parseInt(match[1], 10);
      let month = months[match[2].toLowerCase()];
      // Try with normalized version if not found
      if (month === undefined && matchNormalized) {
        month = months[matchNormalized[2].toLowerCase()];
      }
      const year = parseInt(match[3], 10);
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  const evolutionParDate = useMemo(() => {
    const grouped: Record<string, { ot: number; maison: number; dateObj: Date }> = {};
    filteredData.forEach((e) => {
      if (e.date) {
        const dateObj = parseFrenchDate(e.date);
        if (dateObj) {
          const key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          if (!grouped[key]) {
            grouped[key] = { ot: 0, maison: 0, dateObj };
          }
          grouped[key].ot += e.heures_recherche_ot;
          grouped[key].maison += e.heures_recherche_maison;
        }
      }
    });
    return Object.entries(grouped)
      .map(([key, values]) => ({
        date: values.dateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        sortKey: key,
        ot: Math.round(values.ot * 10) / 10,
        maison: Math.round(values.maison * 10) / 10,
        total: Math.round((values.ot + values.maison) * 10) / 10,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  // Sorted data for table (descending by date)
  const sortedTableData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const dateA = parseFrenchDate(a.date);
      const dateB = parseFrenchDate(b.date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredData]);

  // Paginated data
  const totalPages = Math.ceil(sortedTableData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTableData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTableData, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des données RH...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erreur lors du chargement des données</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <Button onClick={() => navigate("/admin/dashboard")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Suivi RH - Projets IA"
        description="Suivi des heures de travail sur les projets IA"
      />

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Suivi RH - Projets IA</h1>
                <p className="text-sm text-muted-foreground">
                  Suivi des heures de travail et valorisation
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dateStart">Date début</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateEnd">Date fin</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Projet</Label>
                  <Select value={projetFilter} onValueChange={setProjetFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tous les projets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les projets</SelectItem>
                      {projets.map((projet) => (
                        <SelectItem key={projet} value={projet}>
                          {projet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateStart("");
                      setDateEnd("");
                      setProjetFilter("all");
                    }}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpis.totalValorisation.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total valorisé</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpis.totalHeuresOT.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Recherche OT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Home className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpis.totalHeuresMaison.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Recherche Maison</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Briefcase className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpis.nbProjets}</p>
                    <p className="text-xs text-muted-foreground">Projets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{filteredData.length}</p>
                    <p className="text-xs text-muted-foreground">Entrées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours by project */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Heures par projet</CardTitle>
              </CardHeader>
              <CardContent>
                {heuresParProjet.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={heuresParProjet} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar dataKey="heures" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OT vs Maison distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition OT / Maison</CardTitle>
              </CardHeader>
              <CardContent>
                {repartitionOTMaison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={repartitionOTMaison}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {repartitionOTMaison.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evolution over time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Évolution des heures</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionParDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionParDate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ot"
                        name="Recherche OT"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="maison"
                        name="Recherche Maison"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Détail des entrées ({sortedTableData.length} entrées)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Tâche</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead className="text-right">Rech. OT</TableHead>
                      <TableHead className="text-right">Rech. Maison</TableHead>
                      <TableHead className="text-right">Valorisation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune donnée à afficher
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {paginatedData.map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{entry.date}</TableCell>
                            <TableCell>{entry.projet}</TableCell>
                            <TableCell>{entry.tache}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {entry.titre}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.heures_recherche_ot > 0
                                ? `${entry.heures_recherche_ot}h`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.heures_recherche_maison > 0
                                ? `${entry.heures_recherche_maison}h`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.valorisation > 0
                                ? `${entry.valorisation.toFixed(2)}h`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={4} className="text-right">
                            Total
                          </TableCell>
                          <TableCell className="text-right">
                            {kpis.totalHeuresOT.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {kpis.totalHeuresMaison.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {kpis.totalValorisation.toFixed(2)}h
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
