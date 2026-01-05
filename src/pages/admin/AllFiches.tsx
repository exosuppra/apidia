import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { ArrowLeft, Loader2, RefreshCw, Search, Eye, CheckCircle, XCircle, Upload, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FicheDetailsDialog } from "@/components/fiches/FicheDetailsDialog";

import type { Json } from "@/integrations/supabase/types";

interface FicheData {
  id: string;
  fiche_type: string;
  fiche_id: string;
  source: string;
  synced_to_sheets: boolean;
  created_at: string;
  updated_at: string;
  data: Json;
}

export default function AllFiches() {
  const [fiches, setFiches] = useState<FicheData[]>([]);
  const [filteredFiches, setFilteredFiches] = useState<FicheData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFiche, setSelectedFiche] = useState<FicheData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const unsyncedCount = fiches.filter(f => !f.synced_to_sheets).length;

  const verifySync = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sheets-sync', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Vérification terminée",
        description: data.message || `${data.results?.unmarked || 0} fiches à resynchroniser`,
      });

      // Reload fiches to update sync status
      await loadAllFiches();
    } catch (error: unknown) {
      console.error('Erreur lors de la vérification:', error);
      toast({
        title: "Erreur de vérification",
        description: "Impossible de vérifier la synchronisation",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const loadAllFiches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiches_data')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setFiches(data || []);
      setFilteredFiches(data || []);
      toast({
        title: "Fiches chargées",
        description: `${data?.length || 0} fiches trouvées`,
      });
    } catch (error: unknown) {
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

  const syncToSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Synchronisation terminée",
        description: data.message || `${data.results?.synced || 0} fiches synchronisées`,
      });

      // Reload fiches to update sync status
      await loadAllFiches();
    } catch (error: unknown) {
      console.error('Erreur lors de la synchronisation:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser vers Google Sheets",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAllFiches();
  }, []);

  useEffect(() => {
    let result = fiches;

    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter(f => f.fiche_type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(f => {
        const nom = extractNom(f.data);
        const commune = extractCommune(f.data);
        return (
          nom.toLowerCase().includes(search) ||
          commune.toLowerCase().includes(search) ||
          f.fiche_id.includes(search)
        );
      });
    }

    setFilteredFiches(result);
  }, [fiches, typeFilter, searchTerm]);

  // Extract name from APIDAE data structure
  const extractNom = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const nom = obj.nom as Record<string, unknown> | undefined;
    if (nom?.libelleFr) return nom.libelleFr as string;
    if (typeof nom === 'string') return nom;
    return "-";
  };

  // Extract commune from APIDAE data structure
  const extractCommune = (data: Json): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const localisation = obj.localisation as Record<string, unknown> | undefined;
    const adresse = localisation?.adresse as Record<string, unknown> | undefined;
    const commune = adresse?.commune as Record<string, unknown> | undefined;
    return (commune?.nom as string) || "-";
  };

  // Extract contact info from APIDAE data structure
  const extractContact = (data: Json, type: string): string => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return "-";
    const obj = data as Record<string, unknown>;
    const informations = obj.informations as Record<string, unknown> | undefined;
    const moyens = informations?.moyensCommunication as Array<Record<string, unknown>> | undefined;
    if (!moyens) return "-";
    
    const moyen = moyens.find(m => {
      const moyenType = m.type as Record<string, unknown> | undefined;
      return moyenType?.libelleFr === type;
    });
    
    if (moyen) {
      const coordonnees = moyen.coordonnees as Record<string, string> | undefined;
      return coordonnees?.fr || (moyen.coordonnees as string) || "-";
    }
    return "-";
  };

  // Get unique fiche types for filter
  const ficheTypes = [...new Set(fiches.map(f => f.fiche_type))].sort();

  return (
    <>
      <Seo 
        title="Fiches synchronisées - Administration"
        description="Gestion des fiches APIDAE synchronisées"
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
                <h1 className="text-2xl font-bold">Fiches synchronisées</h1>
                <p className="text-sm text-muted-foreground">
                  Données reçues via Make/APIDAE
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={verifySync} 
                variant="outline" 
                size="sm"
                disabled={verifying || fiches.filter(f => f.synced_to_sheets).length === 0}
                title="Vérifie si des fiches ont été supprimées du Google Sheet"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Vérifier
              </Button>
              <Button 
                onClick={syncToSheets} 
                variant="default" 
                size="sm"
                disabled={syncing || unsyncedCount === 0}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Sync Sheets
                {unsyncedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unsyncedCount}
                  </Badge>
                )}
              </Button>
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
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, commune ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {ficheTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fiches Display */}
          <Card>
            <CardHeader>
              <CardTitle>
                {loading ? "Chargement..." : `${filteredFiches.length} fiche(s)`}
              </CardTitle>
              <CardDescription>
                {filteredFiches.length !== fiches.length && 
                  `(${fiches.length} au total)`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement des fiches...</span>
                </div>
              ) : filteredFiches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {fiches.length === 0 ? "Aucune fiche trouvée" : "Aucun résultat pour cette recherche"}
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Commune</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Sync</TableHead>
                        <TableHead>Dernière MAJ</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiches.map((fiche) => (
                        <TableRow key={fiche.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {fiche.fiche_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {fiche.fiche_id}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {extractNom(fiche.data)}
                          </TableCell>
                          <TableCell>
                            {extractCommune(fiche.data)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {extractContact(fiche.data, "Téléphone")}
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">
                            {extractContact(fiche.data, "Mél")}
                          </TableCell>
                          <TableCell className="text-center">
                            {fiche.synced_to_sheets ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(fiche.updated_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFiche(fiche)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Dialog */}
      <FicheDetailsDialog 
        open={!!selectedFiche} 
        onOpenChange={() => setSelectedFiche(null)}
        fiche={selectedFiche}
      />
    </>
  );
}
