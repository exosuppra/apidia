import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { ArrowLeft, Loader2, RefreshCw, Search, Eye, CheckCircle, XCircle, EyeOff, ArrowLeftRight, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FicheDetailsDialog } from "@/components/fiches/FicheDetailsDialog";

import type { Json } from "@/integrations/supabase/types";

interface FicheVerified {
  id: string;
  fiche_type: string;
  fiche_id: string;
  source: string;
  synced_to_sheets: boolean;
  created_at: string;
  updated_at: string;
  data: Json;
  is_published: boolean;
  hidden_reason: string | null;
  verified_at: string;
  verified_by: string | null;
  verification_status: string | null;
}

export default function FichesVerified() {
  const [fiches, setFiches] = useState<FicheVerified[]>([]);
  const [filteredFiches, setFilteredFiches] = useState<FicheVerified[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transferring, setTransferring] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FicheVerified | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState<FicheVerified | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadFiches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiches_verified')
        .select('*')
        .order('verified_at', { ascending: false });

      if (error) throw error;
      
      setFiches(data || []);
      setFilteredFiches(data || []);
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des fiches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fiches vérifiées",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Transfer back to fiches_data
  const transferBack = async (fiche: FicheVerified) => {
    setTransferring(fiche.id);
    try {
      // Re-insert into fiches_data
      const { error: insertError } = await supabase
        .from('fiches_data')
        .upsert({
          fiche_id: fiche.fiche_id,
          fiche_type: fiche.fiche_type,
          source: fiche.source,
          data: fiche.data,
          is_published: fiche.is_published,
          synced_to_sheets: false,
          verification_status: 'not_verified',
          last_verified_at: null,
        }, { onConflict: 'fiche_id' });

      if (insertError) throw insertError;

      // Delete from fiches_verified
      const { error: deleteError } = await supabase
        .from('fiches_verified')
        .delete()
        .eq('id', fiche.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Fiche transférée",
        description: "La fiche a été renvoyée vers les fiches non vérifiées",
      });

      await loadFiches();
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer la fiche",
        variant: "destructive",
      });
    } finally {
      setTransferring(null);
    }
  };

  // Delete permanently
  const deleteFiche = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('fiches_verified')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast({
        title: "Fiche supprimée",
        description: "La fiche a été supprimée définitivement",
      });

      setDeleteConfirm(null);
      await loadFiches();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la fiche",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadFiches();
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

  // Get unique fiche types for filter
  const ficheTypes = [...new Set(fiches.map(f => f.fiche_type))].sort();

  return (
    <>
      <Seo 
        title="Fiches vérifiées - Administration"
        description="Gestion des fiches vérifiées"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-green-500/5 via-background to-primary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin/fiches")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Fiches non vérifiées
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-green-700">Fiches vérifiées</h1>
                <p className="text-sm text-muted-foreground">
                  Fiches validées après vérification
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                {fiches.length} fiche(s) vérifiée(s)
              </Badge>
              <Button 
                onClick={loadFiches} 
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
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-green-700">
                {loading ? "Chargement..." : `${filteredFiches.length} fiche(s) vérifiée(s)`}
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
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  <span className="ml-2">Chargement des fiches...</span>
                </div>
              ) : filteredFiches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {fiches.length === 0 ? "Aucune fiche vérifiée" : "Aucun résultat pour cette recherche"}
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Commune</TableHead>
                        <TableHead>Vérifiée le</TableHead>
                        <TableHead className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Sheets</TooltipTrigger>
                              <TooltipContent>
                                <p>Synchronisé vers Google Sheets</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiches.map((fiche) => (
                        <TableRow key={fiche.id}>
                          <TableCell>
                            {fiche.is_published ? (
                              <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
                                <Eye className="w-3 h-3 mr-1" />
                                Publié
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Masqué
                              </Badge>
                            )}
                          </TableCell>
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
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(fiche.verified_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-center">
                            {fiche.synced_to_sheets ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFiche(fiche)}
                                title="Voir les détails"
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => transferBack(fiche)}
                                disabled={transferring === fiche.id}
                                title="Renvoyer vers non vérifiées"
                              >
                                {transferring === fiche.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <ArrowLeftRight className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(fiche)}
                                className="text-destructive hover:text-destructive"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche "{deleteConfirm && extractNom(deleteConfirm.data)}" sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFiche}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fiche details dialog */}
      {selectedFiche && (
        <FicheDetailsDialog
          open={!!selectedFiche}
          onOpenChange={(open) => !open && setSelectedFiche(null)}
          fiche={selectedFiche}
          onFicheUpdated={loadFiches}
        />
      )}
    </>
  );
}