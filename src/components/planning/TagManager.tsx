import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tag } from "@/types/planning";

const tagSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Couleur invalide"),
});

type TagFormValues = z.infer<typeof tagSchema>;

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onUpdate: () => void;
}

const defaultColors = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function TagManager({ open, onOpenChange, tags, onUpdate }: TagManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      color: defaultColors[0],
    },
  });

  const onSubmit = async (values: TagFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("tags" as any).insert({
        name: values.name,
        color: values.color,
      });

      if (error) throw error;

      toast({
        title: "Tag créé",
        description: "Le tag a été créé avec succès.",
      });

      form.reset();
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      const { error } = await supabase.from("tags" as any).delete().eq("id", tagId);

      if (error) throw error;

      toast({
        title: "Tag supprimé",
        description: "Le tag a été supprimé avec succès.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create tag form */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-4">Créer un nouveau tag</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du tag</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Réseaux sociaux" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input type="color" {...field} className="w-20" />
                          </FormControl>
                          <div className="flex gap-1">
                            {defaultColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className="w-8 h-8 rounded border-2"
                                style={{
                                  backgroundColor: color,
                                  borderColor:
                                    field.value === color ? "#000" : "transparent",
                                }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Création..." : "Créer le tag"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Tags list */}
          <div>
            <h3 className="font-medium mb-4">Tags existants</h3>
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun tag créé pour le moment
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
