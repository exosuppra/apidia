import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagSelector } from "./TagSelector";
import { FileUpload } from "./FileUpload";
import type { Tag, TaskAttachment } from "@/types/planning";

const taskSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.date().optional(),
  selectedTags: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tags: Tag[];
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSuccess,
  tags,
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      selectedTags: [],
    },
  });

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const onSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: task, error } = await supabase
        .from("tasks" as any)
        .insert({
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          due_date: values.due_date?.toISOString() || null,
          created_by: user.id,
        })
        .select()
        .single() as any;

      if (error) throw error;

      setCreatedTaskId(task?.id || null);

      // Add tags
      if (values.selectedTags && values.selectedTags.length > 0 && task?.id) {
        const taskTags = values.selectedTags.map((tagId) => ({
          task_id: task.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from("task_tags" as any)
          .insert(taskTags);

        if (tagsError) throw tagsError;
      }

      toast({
        title: "Tâche créée",
        description: "La tâche a été créée avec succès.",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre de la tâche" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description de la tâche"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">À faire</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="done">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date d'échéance</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Sélectionner une date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedTags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagSelector
                      tags={localTags}
                      selectedTags={field.value || []}
                      onChange={field.onChange}
                      onTagCreated={(newTag) => setLocalTags([...localTags, newTag])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {createdTaskId && (
              <div>
                <FormLabel>Fichiers joints</FormLabel>
                <FileUpload taskId={createdTaskId} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
