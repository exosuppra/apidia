import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title || !startDate || !endDate) return;
    setSaving(true);
    const { error } = await supabase.from("santons_editions").insert({
      title,
      year: parseInt(year),
      start_date: startDate,
      end_date: endDate,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Édition créée" });
      setShowNew(false);
      setTitle("");
      onRefresh();
    }
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
      <Button size="icon" variant="outline" onClick={() => setShowNew(true)}>
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={showNew} onOpenChange={setShowNew}>
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
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
