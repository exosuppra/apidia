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
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Fiches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState<Record<string, any> | null>(null);
  const [edited, setEdited] = useState<Record<string, any>>({});

  const email = user?.email ?? "";

  const query = useQuery({
    queryKey: ["fiches", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-fiches", {
        body: { email },
      });
      if (error) throw error;
      // Edge function returns { data: rows }
      return (data as any)?.data ?? [];
    },
  });

  const columns = useMemo(() => {
    const first = query.data?.[0] || {};
    return Object.keys(first).filter((k) => k !== "code");
  }, [query.data]);

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
      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Mes fiches</h1>
            <p className="text-sm text-muted-foreground">Fiches liées à {email}</p>
          </div>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            Rafraîchir
          </Button>
        </header>

        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : query.isError ? (
          <div className="text-sm text-destructive">Erreur: {(query.error as any)?.message}</div>
        ) : (query.data?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune fiche trouvée pour cet email.</div>
        ) : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="max-w-[320px] truncate" title={row[col]}>
                        {row[col]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button size="sm" onClick={() => openEdit(row)}>Modifier</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Liste de vos fiches</TableCaption>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la fiche</DialogTitle>
          </DialogHeader>

          {original && (
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
              {columns.map((key) => (
                <div key={key} className="space-y-1">
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
              ))}
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
