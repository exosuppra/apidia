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
import { CalendarIcon, Send, Loader2, Sparkles, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagSelector } from "./TagSelector";
import { FileUpload } from "./FileUpload";
import { RichTextEditor } from "./RichTextEditor";
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
  planningId: string | null;
  prefilledDate?: Date | null;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSuccess,
  tags,
  planningId,
  prefilledDate,
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestingValidation, setRequestingValidation] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProposals, setAiProposals] = useState<{ a: string; b: string } | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

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

  useEffect(() => {
    if (open && prefilledDate) {
      form.setValue("due_date", prefilledDate);
    }
  }, [open, prefilledDate, form]);

  const uploadSelectedFiles = async (taskId: string) => {
    if (selectedFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from("task_attachments" as any)
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Fichiers uploadés",
        description: `${selectedFiles.length} fichier(s) ajouté(s) avec succès.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de l'upload",
        description: error.message,
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const onSubmit = async (values: TaskFormValues, requestValidation: boolean = false) => {
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
          planning_id: planningId,
        })
        .select()
        .single() as any;

      if (error) throw error;

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

      // Upload files if any were selected
      if (selectedFiles.length > 0 && task?.id) {
        await uploadSelectedFiles(task.id);
      }

      // Request validation if requested
      if (requestValidation && task?.id) {
        await requestTaskValidation(task.id, values.title, values.description || "", values.due_date?.toISOString() || null);
      }

      toast({
        title: "Tâche créée",
        description: requestValidation 
          ? "La tâche a été créée et une demande de validation a été envoyée."
          : "La tâche a été créée avec succès.",
      });

      form.reset();
      setSelectedFiles([]);
      setAiPrompt("");
      setAiProposals(null);
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

  const requestTaskValidation = async (taskId: string, title: string, description: string, dueDate: string | null) => {
    setRequestingValidation(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-task-validation", {
        body: { taskId, title, description, dueDate },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: error.message,
      });
      throw error;
    } finally {
      setRequestingValidation(false);
    }
  };

  const handleCreateAndValidate = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      await onSubmit(values, true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="flex flex-col gap-4 overflow-hidden">
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

            {/* AI Prompt Section */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <FormLabel className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Générer une description avec l'IA
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">bêta</span>
              </FormLabel>
              <Textarea
                placeholder="Décrivez vos attentes pour la description (ex: ton professionnel, public cible, points clés à mentionner…)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!aiPrompt.trim() || !form.watch("title") || generatingAi}
                onClick={async () => {
                  setGeneratingAi(true);
                  setAiProposals(null);
                  try {
                    const { data, error } = await supabase.functions.invoke("generate-task-description", {
                      body: { title: form.getValues("title"), prompt: aiPrompt },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    setAiProposals({ a: data.proposalA, b: data.proposalB });
                  } catch (err: any) {
                    toast({ variant: "destructive", title: "Erreur IA", description: err.message });
                  } finally {
                    setGeneratingAi(false);
                  }
                }}
              >
                {generatingAi ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Génération...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Générer 2 propositions</>
                )}
              </Button>

              {aiProposals && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "💬 GPT-5-mini", text: aiProposals.a },
                    { label: "✦ Gemini Flash", text: aiProposals.b },
                  ].map((proposal) => (
                    <div key={proposal.label} className="rounded-md border border-border bg-background p-2.5 flex flex-col gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{proposal.label}</span>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-6">{proposal.text}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7"
                        onClick={() => {
                          form.setValue("description", proposal.text);
                          setAiProposals(null);
                        }}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Utiliser
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  previewMode={true} 
                  onFilesSelected={setSelectedFiles}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleCreateAndValidate}
                disabled={loading || uploadingFiles || requestingValidation}
              >
                {requestingValidation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Créer et demander validation
                  </>
                )}
              </Button>
              <Button type="submit" disabled={loading || uploadingFiles || requestingValidation}>
                {loading || uploadingFiles 
                  ? uploadingFiles 
                    ? "Upload des fichiers..." 
                    : "Création..."
                  : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
