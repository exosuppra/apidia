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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { CalendarIcon, Trash2, Send, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagSelector } from "./TagSelector";
import { FileUpload } from "./FileUpload";
import { RichTextEditor } from "./RichTextEditor";
import type { Task, Tag } from "@/types/planning";

const taskSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.date().optional(),
  selectedTags: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSuccess: () => void;
  allTags: Tag[];
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
  allTags,
}: EditTaskDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [requestingValidation, setRequestingValidation] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>(allTags);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: (task.priority as "low" | "medium" | "high") || "medium",
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      selectedTags: task.tags?.map((t) => t.id) || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: (task.priority as "low" | "medium" | "high") || "medium",
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        selectedTags: task.tags?.map((t) => t.id) || [],
      });

      // Mark task as seen
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("task_seen" as any)
            .upsert(
              { task_id: task.id, user_id: user.id, seen_at: new Date().toISOString() },
              { onConflict: "task_id,user_id" }
            );
        }
      })();
    }
  }, [open, task, form]);

  useEffect(() => {
    setLocalTags(allTags);
  }, [allTags]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete attachments from storage
      if (task.attachments && task.attachments.length > 0) {
        const filePaths = task.attachments.map(a => a.file_path);
        const { error: storageError } = await supabase.storage
          .from("task-attachments")
          .remove(filePaths);
        
        if (storageError) console.error("Error deleting files:", storageError);
      }

      // Delete task_attachments records
      await supabase
        .from("task_attachments" as any)
        .delete()
        .eq("task_id", task.id);

      // Delete task_tags
      await supabase
        .from("task_tags" as any)
        .delete()
        .eq("task_id", task.id);

      // Delete the task
      const { error } = await supabase
        .from("tasks" as any)
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tâche supprimée",
        description: "La tâche a été supprimée avec succès.",
      });

      setShowDeleteDialog(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("tasks" as any)
        .update({
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          due_date: values.due_date?.toISOString() || null,
          updated_by: user?.id || null,
        })
        .eq("id", task.id);

      if (error) throw error;

      // Update tags
      // First, delete existing tags
      await supabase.from("task_tags" as any).delete().eq("task_id", task.id);

      // Then, add new tags
      if (values.selectedTags && values.selectedTags.length > 0) {
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
        title: "Tâche mise à jour",
        description: "La tâche a été mise à jour avec succès.",
      });

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

  const requestValidation = async (target?: "laura" | "marie") => {
    setRequestingValidation(true);
    try {
      const values = form.getValues();
      
      const { data, error } = await supabase.functions.invoke("request-task-validation", {
        body: { 
          taskId: task.id, 
          title: values.title, 
          description: values.description || "",
          dueDate: values.due_date?.toISOString() || null,
          target,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Demande envoyée",
        description: "La demande de validation a été envoyée avec succès.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: error.message,
      });
    } finally {
      setRequestingValidation(false);
    }
  };

  // Detect if task has "Article Web" tag
  const selectedTagIds = form.watch("selectedTags") || [];
  const isArticleWeb = selectedTagIds.some(
    (tagId) => localTags.find((t) => t.id === tagId)?.name === "Article Web"
  );

  const getValidationTargetLabel = () => {
    if (!task.validation_target) return "";
    return task.validation_target === "laura" ? " par Laura" : " par Marie";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 overflow-hidden">
            <div className="overflow-y-auto pr-2 space-y-4 flex-1 min-h-0">
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
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Description de la tâche"
                      rows={4}
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
                            format(field.value, "PPP 'à' HH:mm", { locale: fr })
                          ) : (
                            <span>Sélectionner une date et heure</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            const currentDate = field.value || new Date();
                            date.setHours(currentDate.getHours());
                            date.setMinutes(currentDate.getMinutes());
                            field.onChange(date);
                          } else {
                            field.onChange(date);
                          }
                        }}
                        locale={fr}
                        initialFocus
                      />
                      {field.value && (
                        <div className="p-3 border-t">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={field.value.getHours()}
                              onChange={(e) => {
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(e.target.value) || 0);
                                field.onChange(newDate);
                              }}
                              className="w-20"
                            />
                            <span>:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={field.value.getMinutes()}
                              onChange={(e) => {
                                const newDate = new Date(field.value);
                                newDate.setMinutes(parseInt(e.target.value) || 0);
                                field.onChange(newDate);
                              }}
                              className="w-20"
                            />
                          </div>
                        </div>
                      )}
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

              <div>
                <FormLabel>Fichiers joints</FormLabel>
                <FileUpload 
                  taskId={task.id} 
                  existingFiles={task.attachments || []}
                  onFilesUploaded={onSuccess}
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading || deleting || requestingValidation}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading || deleting || requestingValidation}
                >
                  Annuler
                </Button>
                
                {/* Validation section - show status or request button */}
                {task.validation_status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-md text-sm">
                      <Clock className="h-4 w-4" />
                      <span>En attente{getValidationTargetLabel()}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => requestValidation(task.validation_target || undefined)}
                      disabled={loading || deleting || requestingValidation}
                    >
                      {requestingValidation ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" />Relancer</>
                      )}
                    </Button>
                  </div>
                ) : task.validation_status === "validated" ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-md text-sm" title={task.validation_comment || undefined}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Validé{getValidationTargetLabel()}</span>
                  </div>
                ) : task.validation_status === "rejected" ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md text-sm" title={task.validation_comment || undefined}>
                    <XCircle className="h-4 w-4" />
                    <span>Rejeté{getValidationTargetLabel()}</span>
                  </div>
                ) : isArticleWeb ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => requestValidation("laura")}
                      disabled={loading || deleting || requestingValidation}
                    >
                      {requestingValidation ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" />Validation Laura</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => requestValidation("marie")}
                      disabled={loading || deleting || requestingValidation}
                    >
                      {requestingValidation ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" />Validation Marie</>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => requestValidation()}
                    disabled={loading || deleting || requestingValidation}
                  >
                    {requestingValidation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Demander validation
                      </>
                    )}
                  </Button>
                )}
                <Button type="submit" disabled={loading || deleting || requestingValidation}>
                  {loading ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible et supprimera également tous les fichiers joints.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
