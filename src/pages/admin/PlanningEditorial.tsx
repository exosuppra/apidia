import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Tag as TagIcon } from "lucide-react";
import Seo from "@/components/Seo";
import { TaskColumn } from "@/components/planning/TaskColumn";
import { CreateTaskDialog } from "@/components/planning/CreateTaskDialog";
import { TagManager } from "@/components/planning/TagManager";
import type { Task, Tag } from "@/types/planning";

export default function PlanningEditorial() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags" as any)
        .select("*");

      if (tagsError) throw tagsError;

      // Load task-tag relationships
      const { data: taskTagsData, error: taskTagsError } = await supabase
        .from("task_tags" as any)
        .select("*");

      if (taskTagsError) throw taskTagsError;

      // Load task attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("task_attachments" as any)
        .select("*");

      if (attachmentsError) throw attachmentsError;

      // Merge task tags and attachments
      const tasksWithTags = (tasksData || []).map((task: any) => ({
        ...task,
        tags: (taskTagsData || [])
          .filter((tt: any) => tt.task_id === task.id)
          .map((tt: any) => (tagsData || []).find((tag: any) => tag.id === tt.tag_id))
          .filter(Boolean),
        attachments: (attachmentsData || []).filter(
          (att: any) => att.task_id === task.id
        ),
      }));

      setTasks(tasksWithTags);
      setTags((tagsData as any) || []);
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

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Planning éditorial - Administration"
        description="Gérez votre planning de publication sur les réseaux sociaux"
      />

      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold">Planning éditorial</h1>
                  <p className="text-sm text-muted-foreground">
                    Gérez vos publications sur les réseaux sociaux
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTagManagerOpen(true)}
                >
                  <TagIcon className="h-4 w-4 mr-2" />
                  Tags
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn
              title="À faire"
              tasks={todoTasks}
              status="todo"
              onRefresh={loadData}
              tags={tags}
            />
            <TaskColumn
              title="En cours"
              tasks={inProgressTasks}
              status="in_progress"
              onRefresh={loadData}
              tags={tags}
            />
            <TaskColumn
              title="Terminé"
              tasks={doneTasks}
              status="done"
              onRefresh={loadData}
              tags={tags}
            />
          </div>
        </div>
      </div>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadData}
        tags={tags}
      />

      <TagManager
        open={isTagManagerOpen}
        onOpenChange={setIsTagManagerOpen}
        tags={tags}
        onUpdate={loadData}
      />
    </>
  );
}
