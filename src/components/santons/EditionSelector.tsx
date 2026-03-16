import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SantonsEdition } from "@/pages/admin/PlanningSantons";

interface EditionSelectorProps {
  editions: SantonsEdition[];
  selected: SantonsEdition | null;
  onSelect: (e: SantonsEdition) => void;
  onRefresh: () => void;
}

export default function EditionSelector({ editions, selected, onSelect, onRefresh }: EditionSelectorProps) {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Import from previous edition
  const [importFrom, setImportFrom] = useState<string>("");
  const [importSantonniers, setImportSantonniers] = useState(true);
  const [importBenevoles, setImportBenevoles] = useState(true);

  const handleCreate = async () => {
    if (!title || !startDate || !endDate) return;
    setSaving(true);

    try {
      const { data: newEdition, error } = await supabase.from("santons_editions").insert({
        title,
        year: parseInt(year),
        start_date: startDate,
        end_date: endDate,
      }).select().single();

      if (error) throw error;

      // Import from previous edition if selected
      if (importFrom && newEdition) {
        await importFromEdition(importFrom, newEdition.id, startDate, endDate);
      }

      toast({ title: "Édition créée", description: importFrom ? "Données importées depuis l'édition précédente." : undefined });
      setShowNew(false);
      resetForm();
      onRefresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const importFromEdition = async (sourceEditionId: string, targetEditionId: string, newStartDate: string, newEndDate: string) => {
    // Import santonniers
    if (importSantonniers) {
      const { data: srcSantonniers } = await supabase
        .from("santons_santonniers")
        .select("*")
        .eq("edition_id", sourceEditionId);

      if (srcSantonniers && srcSantonniers.length > 0) {
        const santIdMap: Record<string, string> = {};

        for (const s of srcSantonniers) {
          const { data: newSant } = await supabase.from("santons_santonniers").insert({
            edition_id: targetEditionId,
            nom_stand: s.nom_stand,
            prenom: s.prenom,
            nom: s.nom,
            ville: s.ville,
            telephone: s.telephone,
            email: s.email,
            site_web: s.site_web,
            presence_info: s.presence_info,
          }).select("id").single();

          if (newSant) {
            santIdMap[s.id] = newSant.id;
          }
        }

        // Import preferences
        const { data: srcPrefs } = await supabase
          .from("santons_preferences")
          .select("*")
          .in("santonnier_id", Object.keys(santIdMap));

        if (srcPrefs && srcPrefs.length > 0) {
          const newPrefs = srcPrefs
            .filter(p => santIdMap[p.santonnier_id])
            .map(p => ({
              santonnier_id: santIdMap[p.santonnier_id],
              benevole_souhaite: p.benevole_souhaite,
              benevole_non_souhaite: p.benevole_non_souhaite,
            }));
          if (newPrefs.length > 0) {
            await supabase.from("santons_preferences").insert(newPrefs);
          }
        }
      }
    }

    // Import benevoles
    if (importBenevoles) {
      const { data: srcBenevoles } = await supabase
        .from("santons_benevoles")
        .select("*")
        .eq("edition_id", sourceEditionId);

      if (srcBenevoles && srcBenevoles.length > 0) {
        const newBenevoles = srcBenevoles.map(b => ({
          edition_id: targetEditionId,
          civilite: b.civilite,
          prenom: b.prenom,
          nom: b.nom,
          ville: b.ville,
          telephone: b.telephone,
          email: b.email,
          stand_souhaite: b.stand_souhaite,
          souhaite_etre_avec: b.souhaite_etre_avec,
        }));

        // Insert in batches and collect new IDs
        const insertedIds: string[] = [];
        for (let i = 0; i < newBenevoles.length; i += 50) {
          const { data: inserted } = await supabase.from("santons_benevoles").insert(newBenevoles.slice(i, i + 50)).select("id");
          if (inserted) insertedIds.push(...inserted.map(r => r.id));
        }

        // Create disponibilités à false for all days of the new edition
        if (insertedIds.length > 0 && startDate && endDate) {
          const days: string[] = [];
          const s = new Date(startDate);
          const e = new Date(endDate);
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            days.push(d.toISOString().split("T")[0]);
          }

          const dispoRecords = insertedIds.flatMap(benId =>
            days.map(jour => ({ benevole_id: benId, jour, disponible: false }))
          );

          for (let i = 0; i < dispoRecords.length; i += 50) {
            await supabase.from("santons_disponibilites").insert(dispoRecords.slice(i, i + 50));
          }
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);

    try {
      // Delete in order: planning -> disponibilites -> preferences -> benevoles -> santonniers -> edition
      // Get benevole IDs for this edition
      const { data: benData } = await supabase
        .from("santons_benevoles")
        .select("id")
        .eq("edition_id", selected.id);
      const benIds = (benData || []).map(b => b.id);

      // Get santonnier IDs for this edition
      const { data: santData } = await supabase
        .from("santons_santonniers")
        .select("id")
        .eq("edition_id", selected.id);
      const santIds = (santData || []).map(s => s.id);

      // Delete planning
      await supabase.from("santons_planning").delete().eq("edition_id", selected.id);

      // Delete disponibilites
      if (benIds.length > 0) {
        for (let i = 0; i < benIds.length; i += 50) {
          await supabase.from("santons_disponibilites").delete().in("benevole_id", benIds.slice(i, i + 50));
        }
      }

      // Delete preferences
      if (santIds.length > 0) {
        for (let i = 0; i < santIds.length; i += 50) {
          await supabase.from("santons_preferences").delete().in("santonnier_id", santIds.slice(i, i + 50));
        }
      }

      // Delete benevoles
      await supabase.from("santons_benevoles").delete().eq("edition_id", selected.id);

      // Delete santonniers
      await supabase.from("santons_santonniers").delete().eq("edition_id", selected.id);

      // Delete edition
      await supabase.from("santons_editions").delete().eq("id", selected.id);

      toast({ title: "Édition supprimée", description: `"${selected.title}" et toutes ses données ont été supprimées.` });
      setShowDelete(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const resetForm = () => {
    setTitle("");
    setYear(new Date().getFullYear().toString());
    setStartDate("");
    setEndDate("");
    setImportFrom("");
    setImportSantonniers(true);
    setImportBenevoles(true);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selected?.id || ""}
        onValueChange={(id) => {
          const e = editions.find((ed) => ed.id === id);
          if (e) onSelect(e);
        }}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Sélectionner une édition" />
        </SelectTrigger>
        <SelectContent>
          {editions.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title} ({e.year})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon" variant="outline" onClick={() => setShowNew(true)} title="Nouvelle édition">
        <Plus className="w-4 h-4" />
      </Button>
      {selected && (
        <Button size="icon" variant="outline" onClick={() => setShowDelete(true)} title="Supprimer l'édition" className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      {/* Create edition dialog */}
      <Dialog open={showNew} onOpenChange={(open) => { setShowNew(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle édition</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Foire aux Santons 2025" />
            </div>
            <div className="grid gap-2">
              <Label>Année</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date de début</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Date de fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Import from previous edition */}
            {editions.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-semibold">Importer depuis une édition existante</Label>
                <Select value={importFrom} onValueChange={setImportFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Aucune (partir de zéro) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune (partir de zéro) —</SelectItem>
                    {editions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} ({e.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {importFrom && importFrom !== "none" && (
                  <div className="flex flex-col gap-2 pl-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-santonniers"
                        checked={importSantonniers}
                        onCheckedChange={(v) => setImportSantonniers(v === true)}
                      />
                      <label htmlFor="import-santonniers" className="text-sm cursor-pointer">Santonniers et leurs préférences</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="import-benevoles"
                        checked={importBenevoles}
                        onCheckedChange={(v) => setImportBenevoles(v === true)}
                      />
                      <label htmlFor="import-benevoles" className="text-sm cursor-pointer">Bénévoles (sans disponibilités)</label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !title || !startDate || !endDate}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Création…</> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'édition</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>"{selected?.title}"</strong> ? Toutes les données associées seront définitivement supprimées (bénévoles, santonniers, planning, disponibilités, préférences).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Suppression…</> : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
