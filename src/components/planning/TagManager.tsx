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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Edit2, Smile, Check, X } from "lucide-react";
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

const commonEmojis = [
  "📱", "💻", "📷", "🎬", "📝", "📅", "📌", "🎯",
  "🚀", "💼", "📊", "📈", "🔔", "📧", "💬", "🌟",
  "✅", "❌", "⚠️", "💡", "🔥", "⭐", "💪", "🎉",
];

export function TagManager({ open, onOpenChange, tags, onUpdate }: TagManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

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

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = async (tagId: string) => {
    if (!editName.trim()) return;
    
    try {
      const { error } = await supabase
        .from("tags" as any)
        .update({ name: editName, color: editColor })
        .eq("id", tagId);

      if (error) throw error;

      toast({
        title: "Tag modifié",
        description: "Le tag a été modifié avec succès.",
      });

      cancelEditing();
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const insertEmoji = (emoji: string, isEditing: boolean) => {
    if (isEditing) {
      setEditName(editName + emoji);
    } else {
      const currentName = form.getValues("name");
      form.setValue("name", currentName + emoji);
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du tag (avec emoji)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="Ex: 📱 Réseaux sociaux" {...field} className="flex-1" />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="icon">
                              <Smile className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="end">
                            <div className="grid grid-cols-8 gap-1">
                              {commonEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-lg transition-colors"
                                  onClick={() => insertEmoji(emoji, false)}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
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
                          <Input type="color" {...field} className="w-20 h-10 cursor-pointer" />
                        </FormControl>
                        <div className="flex gap-1 flex-wrap">
                          {defaultColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className="w-8 h-8 rounded border-2 transition-transform hover:scale-110"
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
                  {editingTagId === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-8 p-0 cursor-pointer"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8">
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="end">
                          <div className="grid grid-cols-8 gap-1">
                            {commonEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-lg transition-colors"
                                onClick={() => insertEmoji(emoji, true)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => saveEdit(tag.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                        className="text-sm"
                      >
                        {tag.name}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(tag)}
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tag.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
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
