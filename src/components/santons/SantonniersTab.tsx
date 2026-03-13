import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Santonnier } from "@/pages/admin/PlanningSantons";

interface SantonniersTabProps {
  santonniers: Santonnier[];
  editionId: string;
  onRefresh: () => void;
}

const emptyForm = {
  nom_stand: "",
  prenom: "",
  nom: "",
  ville: "",
  telephone: "",
  email: "",
  site_web: "",
  presence_info: "",
  benevole_souhaite: "",
  benevole_non_souhaite: "",
};

export default function SantonniersTab({ santonniers, editionId, onRefresh }: SantonniersTabProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Santonnier) => {
    setEditingId(s.id);
    setForm({
      nom_stand: s.nom_stand,
      prenom: s.prenom || "",
      nom: s.nom || "",
      ville: s.ville || "",
      telephone: s.telephone || "",
      email: s.email || "",
      site_web: s.site_web || "",
      presence_info: s.presence_info || "",
      benevole_souhaite: s.benevole_souhaite || "",
      benevole_non_souhaite: s.benevole_non_souhaite || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom_stand.trim()) return;
    setSaving(true);

    const santonnierData = {
      nom_stand: form.nom_stand,
      prenom: form.prenom || null,
      nom: form.nom || null,
      ville: form.ville || null,
      telephone: form.telephone || null,
      email: form.email || null,
      site_web: form.site_web || null,
      presence_info: form.presence_info || null,
    };

    if (editingId) {
      await supabase.from("santons_santonniers").update(santonnierData).eq("id", editingId);
      // Upsert preferences
      await supabase.from("santons_preferences").delete().eq("santonnier_id", editingId);
      await supabase.from("santons_preferences").insert({
        santonnier_id: editingId,
        benevole_souhaite: form.benevole_souhaite || null,
        benevole_non_souhaite: form.benevole_non_souhaite || null,
      });
    } else {
      const { data: newSant } = await supabase
        .from("santons_santonniers")
        .insert({ ...santonnierData, edition_id: editionId })
        .select("id")
        .single();
      if (newSant) {
        await supabase.from("santons_preferences").insert({
          santonnier_id: newSant.id,
          benevole_souhaite: form.benevole_souhaite || null,
          benevole_non_souhaite: form.benevole_non_souhaite || null,
        });
      }
    }

    setSaving(false);
    setShowForm(false);
    onRefresh();
    toast({ title: editingId ? "Santonnier modifié" : "Santonnier ajouté" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce santonnier ?")) return;
    await supabase.from("santons_santonniers").delete().eq("id", id);
    onRefresh();
    toast({ title: "Santonnier supprimé" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Santonniers</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du stand</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Présence</TableHead>
              <TableHead>Bénévole souhaité</TableHead>
              <TableHead>Bénévole non souhaité</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {santonniers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nom_stand}</TableCell>
                <TableCell className="text-xs">
                  {s.prenom} {s.nom}
                  {s.telephone && <div>{s.telephone}</div>}
                </TableCell>
                <TableCell>{s.ville}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{s.presence_info}</TableCell>
                <TableCell className="text-xs text-green-700">{s.benevole_souhaite}</TableCell>
                <TableCell className="text-xs text-red-600">{s.benevole_non_souhaite}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {santonniers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucun santonnier. Ajoutez-en ou importez un fichier Excel.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le santonnier" : "Ajouter un santonnier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Nom du stand *</Label>
              <Input value={form.nom_stand} onChange={(e) => setForm({ ...form, nom_stand: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prénom</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div>
                <Label>Nom</Label>
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
              <Label>Site web</Label>
              <Input value={form.site_web} onChange={(e) => setForm({ ...form, site_web: e.target.value })} />
            </div>
            <div>
              <Label>Infos de présence</Label>
              <Textarea value={form.presence_info} onChange={(e) => setForm({ ...form, presence_info: e.target.value })} placeholder="Jours de présence, absences…" />
            </div>
            <div>
              <Label>Bénévole souhaité</Label>
              <Input value={form.benevole_souhaite} onChange={(e) => setForm({ ...form, benevole_souhaite: e.target.value })} className="border-green-300" />
            </div>
            <div>
              <Label>Bénévole non souhaité</Label>
              <Input value={form.benevole_non_souhaite} onChange={(e) => setForm({ ...form, benevole_non_souhaite: e.target.value })} className="border-red-300" />
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
