import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tag } from "@/types/planning";

interface TagSelectorProps {
  tags: Tag[];
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  onTagCreated?: (tag: Tag) => void;
}

export function TagSelector({ tags, selectedTags, onChange, onTagCreated }: TagSelectorProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id));
  const availableTags = tags.filter((tag) => !selectedTags.includes(tag.id));

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const handleAddTag = (tagId: string) => {
    onChange([...selectedTags, tagId]);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const { data: tag, error } = await supabase
        .from("tags" as any)
        .insert({
          name: newTagName.trim(),
          color: newTagColor,
        })
        .select()
        .single() as any;

      if (error) throw error;

      toast({
        title: "Tag créé",
        description: "Le tag a été créé avec succès.",
      });

      onTagCreated?.(tag);
      onChange([...selectedTags, tag.id]);
      setCreateDialogOpen(false);
      setNewTagName("");
      setNewTagColor("#3b82f6");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTagObjects.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            style={{
              backgroundColor: `${tag.color}20`,
              borderColor: tag.color,
              color: tag.color,
            }}
            className="pr-1"
          >
            {tag.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            Ajouter un tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un tag..." />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Aucun tag trouvé.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un nouveau tag
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleAddTag(tag.id)}
                  >
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              {availableTags.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un nouveau tag
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tag-name">Nom du tag</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nom du tag"
              />
            </div>
            <div>
              <Label htmlFor="tag-color">Couleur</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateTag} disabled={creating || !newTagName.trim()}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
