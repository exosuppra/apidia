import Seo from "@/components/Seo";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Edit3 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SimpleMapPicker from "@/components/SimpleMapPicker";

const FichesHeader = ({
  email,
  count,
  search,
  onSearch,
  onRefresh,
  refreshing,
}: {
  email: string;
  count: number;
  search: string;
  onSearch: (v: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold">Mes fiches</h1>
      <p className="text-sm text-muted-foreground">Fiches liées à {email}</p>
    </div>
    <div className="flex w-full sm:w-auto items-center gap-2">
      <div className="relative flex-1 sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans vos fiches..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Badge variant="secondary" className="whitespace-nowrap">{count} fiche{count > 1 ? "s" : ""}</Badge>
      <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className="mr-2 h-4 w-4" /> Rafraîchir
      </Button>
    </div>
  </header>
);

export default function Fiches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState<Record<string, any> | null>(null);
  const [edited, setEdited] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const email = user?.email ?? "";

  const query = useQuery({
    queryKey: ["fiches", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-fiches", {
        body: { email },
      });
      if (error) throw error;
      return (data as any)?.data ?? [];
    },
  });

  const data = query.data ?? [];
  const filteredData = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter((row: Record<string, any>) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [data, search]);

  const columns = useMemo(() => {
    const first = data?.[0] || {};
    return Object.keys(first).filter((k) => k !== "code");
  }, [data]);

  const nonEditable = new Set(["id", "email", "code"]);

  const openEdit = (row: Record<string, any>) => {
    setOriginal(row);
    setEdited(row);
    setOpen(true);
  };

  const closeEdit = () => {
    setOpen(false);
    setOriginal(null);
    setEdited({});
  };

  const onChangeField = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const computeChanges = () => {
    if (!original) return {} as Record<string, any>;
    const changes: Record<string, any> = {};
    for (const key of Object.keys(edited)) {
      if (nonEditable.has(key)) continue;
      const before = (original as any)[key] ?? "";
      const after = (edited as any)[key] ?? "";
      if (before !== after) changes[key] = after;
    }
    return changes;
  };

  const previewOf = (row: Record<string, any>) => {
    const parts: string[] = [];
    const nom = row["nom"] || row["Nom"] || row["title"];
    if (nom) parts.push(String(nom));
    const commune = row["commune"] || row["Commune"];
    const lieu = row["lieu"] || row["nom du lieu (adresse)"];
    const desc = row["descriptif court"] || row["descriptif détaillé"];
    const more = desc || lieu || commune;
    if (more) parts.push(String(more));
    const text = parts.filter(Boolean).join(" — ");
    return text.length > 160 ? text.slice(0, 160) + "…" : text;
  };

  const submitUpdate = async () => {
    if (!original) return;
    const changes = computeChanges();
    if (Object.keys(changes).length === 0) {
      toast({ title: "Aucune modification", description: "Aucun champ modifié." });
      return;
    }

    const id = (original as any)["id"] || (original as any)["identifiant"] || "";
    const rowEmail = (original as any)["email"] || email;

    const { error } = await supabase.functions.invoke("request-update", {
      body: {
        id,
        email: rowEmail,
        changes,
        original,
      },
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande envoyée", description: "Votre demande de mise à jour a été transmise." });
      closeEdit();
    }
  };

  return (
    <>
      <Seo
        title="Mes fiches | Apidia"
        description="Consultez et demandez la mise à jour de vos fiches associées à votre email."
      />
      <section className="space-y-6 animate-fade-in">
        <FichesHeader
          email={email}
          count={filteredData.length}
          search={search}
          onSearch={setSearch}
          onRefresh={() => query.refetch()}
          refreshing={query.isFetching}
        />

{query.isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-48"><Skeleton className="h-8 w-48" /></div>
            <div className="overflow-hidden rounded-md border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 p-3 border-b last:border-b-0">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(query.error as any)?.message}</AlertDescription>
          </Alert>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <div className="text-lg font-medium mb-1">Aucune fiche trouvée</div>
            <p className="text-sm text-muted-foreground mb-4">Aucune fiche associée à l'adresse {email}.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Rafraîchir
            </Button>
          </div>
        ) : (filteredData?.length ?? 0) === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <div className="text-lg font-medium mb-1">Aucun résultat</div>
            <p className="text-sm text-muted-foreground">Aucune fiche ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="whitespace-nowrap">ID</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Aperçu</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row: any, idx: number) => {
                  const id = row["id"] ?? row["identifiant"] ?? "";
                  const type = row["type"] ?? "";
                  const preview = previewOf(row);
                  return (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{id}</TableCell>
                      <TableCell>{type}</TableCell>
                      <TableCell className="max-w-[520px] truncate" title={preview}>{preview || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openEdit(row)} className="hover-scale">
                          <Edit3 className="mr-2 h-4 w-4" /> Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableCaption>{filteredData.length} fiche{filteredData.length > 1 ? "s" : ""}</TableCaption>
            </Table>
          </div>
        )}
      </section>

<Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl animate-enter">
          <DialogHeader>
            <DialogTitle>
              {`Modifier la fiche${original ? ` #${(original as any)["id"] || (original as any)["identifiant"] || ""} — ${(original as any)["nom"] || ""}` : ""}`}
            </DialogTitle>
          </DialogHeader>

          {original && (
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
              {columns.map((key, index) => {
                // Afficher la carte après "descriptif détaillé" et avant "latitude"
                const showMapAfter = key === "descriptif détaillé" || key === "Descriptif détaillé";
                const shouldShowMap = (columns.includes('latitude') && columns.includes('longitude'));
                
                return (
                  <div key={key}>
                    {/* Champs normaux */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{key}</div>
                      {nonEditable.has(key) ? (
                        <Input value={(edited as any)[key] ?? ""} disabled />
                      ) : ((edited as any)[key]?.toString()?.length ?? 0) > 120 ? (
                        <Textarea
                          value={(edited as any)[key] ?? ""}
                          onChange={(e) => onChangeField(key, e.target.value)}
                        />
                      ) : (
                        <Input
                          value={(edited as any)[key] ?? ""}
                          onChange={(e) => onChangeField(key, e.target.value)}
                        />
                      )}
                    </div>

                    {/* Afficher la carte après le descriptif détaillé */}
                    {showMapAfter && shouldShowMap && (
                      <div className="mt-6 mb-2">
                        <SimpleMapPicker
                          latitude={parseFloat((edited as any)['latitude']) || undefined}
                          longitude={parseFloat((edited as any)['longitude']) || undefined}
                          onCoordinatesChange={(lat, lng) => {
                            onChangeField('latitude', lat.toString());
                            onChangeField('longitude', lng.toString());
                          }}
                          // Passer l'adresse pour géocodage automatique
                          address={[
                            (edited as any)['adresse 1'] || (edited as any)['Adresse 1'] || '',
                            (edited as any)['adresse 2'] || (edited as any)['Adresse 2'] || '',
                            (edited as any)['adresse 3'] || (edited as any)['Adresse 3'] || '',
                            (edited as any)['code postal'] || (edited as any)['Code postal'] || '',
                            (edited as any)['commune'] || (edited as any)['Commune'] || ''
                          ].filter(Boolean).join(', ')}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>Annuler</Button>
            <Button onClick={submitUpdate}>Demander la mise à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
