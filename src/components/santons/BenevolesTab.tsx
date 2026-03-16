import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Benevole } from "@/pages/admin/PlanningSantons";
import { ScrollArea } from "@/components/ui/scroll-area";

type SortKey = "nom" | "ville" | "stand_souhaite" | "dispos";
type SortDir = "asc" | "desc";

interface BenevolesTabProps {
  benevoles: Benevole[];
  days: string[];
  editionId: string;
  onRefresh: () => void;
}

const emptyForm = {
  civilite: "",
  prenom: "",
  nom: "",
  ville: "",
  telephone: "",
  email: "",
  stand_souhaite: "",
  souhaite_etre_avec: "",
};

export default function BenevolesTab({ benevoles, days, editionId, onRefresh }: BenevolesTabProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dispos, setDispos] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const sortedBenevoles = useMemo(() => {
    const arr = [...benevoles];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "nom": {
          const aName = `${a.nom} ${a.prenom || ""}`.toLowerCase();
          const bName = `${b.nom} ${b.prenom || ""}`.toLowerCase();
          return aName.localeCompare(bName) * dir;
        }
        case "ville": {
          return (a.ville || "").localeCompare(b.ville || "") * dir;
        }
        case "stand_souhaite": {
          return (a.stand_souhaite || "").localeCompare(b.stand_souhaite || "") * dir;
        }
        case "dispos": {
          const aCount = Object.values(a.disponibilites).filter(Boolean).length;
          const bCount = Object.values(b.disponibilites).filter(Boolean).length;
          return (aCount - bCount) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [benevoles, sortKey, sortDir]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDispos(Object.fromEntries(days.map((d) => [d, false])));
    setShowForm(true);
  };

  const openEdit = (b: Benevole) => {
    setEditingId(b.id);
    setForm({
      civilite: b.civilite || "",
      prenom: b.prenom || "",
      nom: b.nom,
      ville: b.ville || "",
      telephone: b.telephone || "",
      email: b.email || "",
      stand_souhaite: b.stand_souhaite || "",
      souhaite_etre_avec: b.souhaite_etre_avec || "",
    });
    setDispos({ ...Object.fromEntries(days.map((d) => [d, false])), ...b.disponibilites });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) return;
    setSaving(true);

    if (editingId) {
      await supabase.from("santons_benevoles").update({
        civilite: form.civilite || null,
        prenom: form.prenom || null,
        nom: form.nom,
        ville: form.ville || null,
        telephone: form.telephone || null,
        email: form.email || null,
        stand_souhaite: form.stand_souhaite || null,
        souhaite_etre_avec: form.souhaite_etre_avec || null,
      }).eq("id", editingId);

      // Upsert dispos
      await supabase.from("santons_disponibilites").delete().eq("benevole_id", editingId);
      const dispoRows = Object.entries(dispos).map(([jour, disponible]) => ({
        benevole_id: editingId,
        jour,
        disponible,
      }));
      if (dispoRows.length > 0) {
        await supabase.from("santons_disponibilites").insert(dispoRows);
      }
    } else {
      const { data: newBen } = await supabase.from("santons_benevoles").insert({
        edition_id: editionId,
        civilite: form.civilite || null,
        prenom: form.prenom || null,
        nom: form.nom,
        ville: form.ville || null,
        telephone: form.telephone || null,
        email: form.email || null,
        stand_souhaite: form.stand_souhaite || null,
        souhaite_etre_avec: form.souhaite_etre_avec || null,
      }).select("id").single();

      if (newBen) {
        const dispoRows = Object.entries(dispos).map(([jour, disponible]) => ({
          benevole_id: newBen.id,
          jour,
          disponible,
        }));
        if (dispoRows.length > 0) {
          await supabase.from("santons_disponibilites").insert(dispoRows);
        }
      }
    }

    setSaving(false);
    setShowForm(false);
    onRefresh();
    toast({ title: editingId ? "Bénévole modifié" : "Bénévole ajouté" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bénévole ?")) return;
    await supabase.from("santons_benevoles").delete().eq("id", id);
    onRefresh();
    toast({ title: "Bénévole supprimé" });
  };

  const formatDay = (d: string) => {
    try {
      return format(new Date(d), "EEE dd/MM", { locale: fr });
    } catch {
      return d;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Bénévoles</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nom")}>
                    <span className="inline-flex items-center">Nom <SortIcon col="nom" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("ville")}>
                    <span className="inline-flex items-center">Ville <SortIcon col="ville" /></span>
                  </TableHead>
                  <TableHead>Tél</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("stand_souhaite")}>
                    <span className="inline-flex items-center">Stand souhaité <SortIcon col="stand_souhaite" /></span>
                  </TableHead>
                  <TableHead>Avec</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dispos")}>
                    <span className="inline-flex items-center">Dispos <SortIcon col="dispos" /></span>
                  </TableHead>
                  {days.map((d) => (
                    <TableHead key={d} className="text-center text-xs px-1 min-w-[60px]">
                      {formatDay(d)}
                    </TableHead>
                  ))}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBenevoles.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {b.civilite} {b.prenom} {b.nom}
                    </TableCell>
                    <TableCell>{b.ville}</TableCell>
                    <TableCell className="text-xs">{b.telephone}</TableCell>
                    <TableCell className="text-xs">{b.stand_souhaite}</TableCell>
                    <TableCell className="text-xs">{b.souhaite_etre_avec}</TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {Object.values(b.disponibilites).filter(Boolean).length}/{days.length}
                    </TableCell>
                    {days.map((d) => (
                      <TableCell key={d} className="text-center px-1">
                        <span className={`inline-block w-4 h-4 rounded-full ${b.disponibilites[d] ? "bg-green-500" : "bg-red-300"}`} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {benevoles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6 + days.length} className="text-center text-muted-foreground py-8">
                      Aucun bénévole. Ajoutez-en ou importez un fichier Excel.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le bénévole" : "Ajouter un bénévole"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Civilité</Label>
                <Input value={form.civilite} onChange={(e) => setForm({ ...form, civilite: e.target.value })} placeholder="Mr/Mme" />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ville</Label>
                <Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Stand souhaité</Label>
              <Input value={form.stand_souhaite} onChange={(e) => setForm({ ...form, stand_souhaite: e.target.value })} />
            </div>
            <div>
              <Label>Souhaite être avec</Label>
              <Input value={form.souhaite_etre_avec} onChange={(e) => setForm({ ...form, souhaite_etre_avec: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">Disponibilités</Label>
              <div className="grid grid-cols-2 gap-2">
                {days.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={dispos[d] || false}
                      onCheckedChange={(checked) => setDispos({ ...dispos, [d]: !!checked })}
                    />
                    {formatDay(d)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function formatDay(d: string) {
  try {
    return format(new Date(d), "EEE dd/MM", { locale: fr });
  } catch {
    return d;
  }
}
