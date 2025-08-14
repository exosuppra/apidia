import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Search, Edit, Eye, RefreshCw } from "lucide-react";
import Seo from "@/components/Seo";

interface Fiche {
  [key: string]: any;
  _rowIndex: number;
  _sheet: string;
}

export default function AdminFiches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [filteredFiches, setFilteredFiches] = useState<Fiche[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFiche, setEditingFiche] = useState<Fiche | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});

  // Charger la liste des feuilles
  useEffect(() => {
    const loadSheets = async () => {
      if (!user?.email) return;

      try {
        const { data } = await supabase.functions.invoke("admin-list-all-fiches", {
          body: { adminEmail: user.email }
        });

        if (data?.sheets) {
          setSheets(data.sheets);
          if (data.sheets.length > 0) {
            setSelectedSheet(data.sheets[0]);
          }
        }
      } catch (error) {
        console.error("Error loading sheets:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les feuilles",
          variant: "destructive"
        });
      }
    };

    loadSheets();
  }, [user]);

  // Charger les fiches d'une feuille
  useEffect(() => {
    const loadFiches = async () => {
      if (!user?.email || !selectedSheet) return;

      try {
        setLoading(true);
        const { data } = await supabase.functions.invoke("admin-list-all-fiches", {
          body: { 
            adminEmail: user.email,
            sheetName: selectedSheet
          }
        });

        if (data) {
          setFiches(data.data || []);
          setFilteredFiches(data.data || []);
          setHeaders(data.headers || []);
        }
      } catch (error) {
        console.error("Error loading fiches:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les fiches",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadFiches();
  }, [user, selectedSheet]);

  // Filtrer les fiches
  useEffect(() => {
    if (!searchTerm) {
      setFilteredFiches(fiches);
      return;
    }

    const filtered = fiches.filter(fiche =>
      Object.values(fiche).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredFiches(filtered);
  }, [searchTerm, fiches]);

  const handleEdit = (fiche: Fiche) => {
    setEditingFiche(fiche);
    setEditFormData({ ...fiche });
  };

  const handleSaveEdit = async () => {
    if (!editingFiche || !user?.email) return;

    try {
      const updates: Record<string, string> = {};
      const originalData: Record<string, string> = {};

      // Identifier les champs modifiés
      headers.forEach(header => {
        const headerLower = header.toLowerCase();
        if (editFormData[headerLower] !== editingFiche[headerLower]) {
          updates[headerLower] = editFormData[headerLower];
          originalData[headerLower] = editingFiche[headerLower];
        }
      });

      if (Object.keys(updates).length === 0) {
        toast({
          title: "Aucune modification",
          description: "Aucun champ n'a été modifié",
        });
        return;
      }

      const { error } = await supabase.functions.invoke("admin-update-fiche", {
        body: {
          adminEmail: user.email,
          sheetName: selectedSheet,
          rowIndex: editingFiche._rowIndex,
          updates,
          originalData
        }
      });

      if (error) throw error;

      toast({
        title: "Fiche mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });

      setEditingFiche(null);
      
      // Recharger les données
      const { data } = await supabase.functions.invoke("admin-list-all-fiches", {
        body: { 
          adminEmail: user.email,
          sheetName: selectedSheet
        }
      });

      if (data) {
        setFiches(data.data || []);
        setFilteredFiches(data.data || []);
      }

    } catch (error) {
      console.error("Error updating fiche:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la fiche",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Seo
        title="Gestion des fiches | Administration Apidia"
        description="Interface d'administration pour gérer toutes les fiches des Google Sheets Apidia"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des fiches</h1>
          <p className="text-muted-foreground">
            Consulter et modifier toutes les fiches des Google Sheets
          </p>
        </div>

        {/* Sélection de feuille et recherche */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres et recherche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="sheet-select">Feuille Google Sheets</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une feuille" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map(sheet => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="search">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Rechercher dans les fiches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des fiches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Fiches - {selectedSheet}
                {filteredFiches.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredFiches.length} fiche{filteredFiches.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {loading ? "Chargement..." : `${filteredFiches.length} fiche(s) trouvée(s)`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Chargement des fiches...</div>
            ) : filteredFiches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune fiche trouvée
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.slice(0, 5).map(header => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiches.map((fiche, index) => (
                      <TableRow key={index}>
                        {headers.slice(0, 5).map(header => (
                          <TableCell key={header} className="max-w-48 truncate">
                            {fiche[header.toLowerCase()] || '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Détails de la fiche</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 max-h-96 overflow-y-auto">
                                  {headers.map(header => (
                                    <div key={header} className="grid grid-cols-3 gap-4">
                                      <Label className="font-medium">{header}</Label>
                                      <div className="col-span-2 text-sm">
                                        {fiche[header.toLowerCase()] || '-'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(fiche)}
                            >
                              <Edit className="h-4 w-4" />
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

        {/* Dialog d'édition */}
        {editingFiche && (
          <Dialog open={!!editingFiche} onOpenChange={() => setEditingFiche(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Modifier la fiche</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {headers.map(header => (
                  <div key={header} className="space-y-2">
                    <Label htmlFor={header}>{header}</Label>
                    <Input
                      id={header}
                      value={editFormData[header.toLowerCase()] || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        [header.toLowerCase()]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingFiche(null)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit}>
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}