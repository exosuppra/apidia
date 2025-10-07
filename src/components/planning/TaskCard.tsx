import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical, Trash2, Edit2, Paperclip } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditTaskDialog } from "./EditTaskDialog";
import type { Task, Tag } from "@/types/planning";

interface TaskCardProps {
  task: Task;
  onRefresh: () => void;
  allTags: Tag[];
}

export function TaskCard({ task, onRefresh, allTags }: TaskCardProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "Haute";
      case "medium":
        return "Moyenne";
      case "low":
        return "Basse";
      default:
        return "Non définie";
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("tasks" as any)
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tâche supprimée",
        description: "La tâche a été supprimée avec succès.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm">{task.title}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags?.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                style={{
                  backgroundColor: `${tag.color}20`,
                  borderColor: tag.color,
                  color: tag.color,
                }}
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments.length} fichier(s) joint(s)</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <Badge variant={getPriorityColor(task.priority)}>
              {getPriorityLabel(task.priority)}
            </Badge>
            {task.due_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(task.due_date), "d MMM", { locale: fr })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={task}
        onSuccess={onRefresh}
        allTags={allTags}
      />
    </>
  );
}
