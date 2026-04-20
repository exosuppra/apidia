import { useState } from "react";
import { Plus, FolderKanban, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EditorialPlanning } from "@/types/planning";
import { logUserAction } from "@/lib/logUserAction";

interface PlanningSelectorProps {
  plannings: EditorialPlanning[];
  selectedPlanningId: string | null;
  onPlanningChange: (planningId: string) => void;
  onRefresh: () => void;
}

export function PlanningSelector({
  plannings,
  selectedPlanningId,
  onPlanningChange,
  onRefresh,
}: PlanningSelectorProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedPlanning = plannings.find((p) => p.id === selectedPlanningId);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le titre est requis",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("editorial_plannings").insert({
        title,
        description: description || null,
        created_by: user.id,
      });

      if (error) throw error;

      logUserAction("create_planning", { title });
      toast({
        title: "Succès",
        description: "Planning créé avec succès",
      });

      setTitle("");
      setDescription("");
      setIsCreateDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPlanningId || !title.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le titre est requis",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("editorial_plannings")
        .update({
          title,
          description: description || null,
        })
        .eq("id", selectedPlanningId);

      if (error) throw error;

      logUserAction("update_planning", { planning_id: selectedPlanningId, title });
      toast({
        title: "Succès",
        description: "Planning modifié avec succès",
      });

      setTitle("");
      setDescription("");
      setIsEditDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlanningId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("editorial_plannings")
        .delete()
        .eq("id", selectedPlanningId);

      if (error) throw error;

      logUserAction("delete_planning", { planning_id: selectedPlanningId });
      toast({
        title: "Succès",
        description: "Planning supprimé avec succès",
      });

      setIsDeleteDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = () => {
    if (selectedPlanning) {
      setTitle(selectedPlanning.title);
      setDescription(selectedPlanning.description || "");
      setIsEditDialogOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedPlanningId || ""} onValueChange={onPlanningChange}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Sélectionner un planning" />
          </SelectTrigger>
          <SelectContent>
            {plannings.map((planning) => (
              <SelectItem key={planning.id} value={planning.id}>
                {planning.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {selectedPlanningId && (
          <>
            <Button variant="outline" size="icon" onClick={openEditDialog}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau planning</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau planning éditorial pour organiser vos tâches
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réseaux sociaux Q1 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du planning..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le planning</DialogTitle>
            <DialogDescription>
              Modifiez les informations de votre planning éditorial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réseaux sociaux Q1 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du planning..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce planning ? Toutes les tâches
              associées seront également supprimées. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
