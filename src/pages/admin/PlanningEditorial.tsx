import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Tag as TagIcon, Calendar, LayoutGrid, Search, X } from "lucide-react";
import Seo from "@/components/Seo";
import { TaskColumn } from "@/components/planning/TaskColumn";
import { CalendarView } from "@/components/planning/CalendarView";
import { CreateTaskDialog } from "@/components/planning/CreateTaskDialog";
import { TagManager } from "@/components/planning/TagManager";
import { PlanningSelector } from "@/components/planning/PlanningSelector";
import type { Task, Tag, EditorialPlanning } from "@/types/planning";

export default function PlanningEditorial() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [plannings, setPlannings] = useState<EditorialPlanning[]>([]);
  const [selectedPlanningId, setSelectedPlanningId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("calendar");
  const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Load plannings
      const { data: planningsData, error: planningsError } = await supabase
        .from("editorial_plannings")
        .select("*")
        .order("created_at", { ascending: false });

      if (planningsError) throw planningsError;

      // If no plannings exist, create a default one
      if (!planningsData || planningsData.length === 0) {
        const { data: newPlanning, error: createError } = await supabase
          .from("editorial_plannings")
          .insert({
            title: "Mon planning éditorial",
            description: "Planning principal",
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        setPlannings([newPlanning as any]);
        setSelectedPlanningId(newPlanning.id);
      } else {
        setPlannings(planningsData as any);
        // Select the first planning if none is selected
        if (!selectedPlanningId) {
          setSelectedPlanningId(planningsData[0].id);
        }
      }

      // Load tasks (will be filtered by planning in UI)
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

  const handleDateDoubleClick = (date: Date) => {
    setPrefilledDate(date);
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setPrefilledDate(null);
    }
  };

  // Filter tasks by selected planning and search term
  const filteredTasks = tasks.filter((t) => {
    if (t.planning_id !== selectedPlanningId) return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesTitle = t.title.toLowerCase().includes(search);
      const matchesDescription = t.description?.toLowerCase().includes(search);
      return matchesTitle || matchesDescription;
    }
    
    return true;
  });
  
  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

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
        <div className="border-b bg-card transition-all duration-300">
          <div className="container mx-auto px-4 py-6 animate-fade-in space-y-4">
            {/* Ligne 1: Titre et bouton retour */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin/dashboard")}
                  className="transition-all hover:scale-105"
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
              
              {/* Actions principales à droite */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === "kanban" ? "calendar" : "kanban")}
                  className="transition-all hover:scale-105"
                >
                  {viewMode === "kanban" ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendrier
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Kanban
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  disabled={!selectedPlanningId}
                  className="transition-all hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </div>
            </div>

            {/* Ligne 2: Sélecteur de planning, recherche et filtres */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PlanningSelector
                  plannings={plannings}
                  selectedPlanningId={selectedPlanningId}
                  onPlanningChange={setSelectedPlanningId}
                  onRefresh={loadData}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="transition-all hover:scale-105"
                >
                  <TagIcon className="h-4 w-4 mr-2" />
                  Gérer les tags
                </Button>
              </div>

              {/* Barre de recherche */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une tâche..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {searchTerm && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredTasks.length} résultat{filteredTasks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
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
          ) : (
            <CalendarView 
              tasks={filteredTasks} 
              tags={tags} 
              onRefresh={loadData}
              onDateDoubleClick={handleDateDoubleClick}
            />
          )}
        </div>
      </div>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onSuccess={loadData}
        tags={tags}
        planningId={selectedPlanningId}
        prefilledDate={prefilledDate}
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
