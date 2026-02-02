import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical, Trash2, Edit2, Paperclip, Check, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const isDone = task.status === "done";

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

  const getValidationBadge = () => {
    if (!task.validation_status) return null;

    const badgeConfig = {
      pending: {
        icon: Clock,
        label: "En attente",
        className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
      },
      validated: {
        icon: CheckCircle2,
        label: "Validé",
        className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
      },
      rejected: {
        icon: XCircle,
        label: "Rejeté",
        className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
      },
    };

    const config = badgeConfig[task.validation_status];
    if (!config) return null;

    const Icon = config.icon;
    const badge = (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );

    if (task.validation_comment) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Commentaire :</p>
              <p>{task.validation_comment}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
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

  const handleMarkDone = async () => {
    try {
      const { error } = await supabase
        .from("tasks" as any)
        .update({ status: "done" })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tâche terminée",
        description: "La tâche a été marquée comme terminée.",
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

  // Simple markdown rendering for bold and italic
  const renderDescription = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-fade-in ${
            isDone ? "opacity-60 bg-muted/50" : ""
          }`}>
            <CardContent className="p-4 transition-all">
              <div className="flex items-start justify-between mb-2">
                <h3 
                  className={`font-medium text-sm cursor-pointer hover:text-primary transition-colors ${
                    isDone ? "line-through text-muted-foreground" : ""
                  }`}
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  {task.title}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent transition-all">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="animate-scale-in">
                    {!isDone && (
                      <DropdownMenuItem 
                        onClick={handleMarkDone}
                        className="transition-colors hover:bg-accent"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Marquer terminée
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => setIsEditDialogOpen(true)}
                      className="transition-colors hover:bg-accent"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {task.description && (
                <p 
                  className={`text-xs text-muted-foreground mb-3 line-clamp-2 ${isDone ? "line-through" : ""}`}
                  dangerouslySetInnerHTML={{ __html: renderDescription(task.description) }}
                />
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
                {getValidationBadge()}
              </div>

              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <Paperclip className="h-3 w-3" />
                  <span>{task.attachments.length} fichier(s) joint(s)</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <Badge variant={getPriorityColor(task.priority)} className={isDone ? "opacity-60" : ""}>
                  {getPriorityLabel(task.priority)}
                </Badge>
                {task.due_date && (
                  <div className={`flex items-center gap-1 text-muted-foreground ${isDone ? "line-through" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(task.due_date), "d MMM", { locale: fr })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {!isDone && (
            <ContextMenuItem onClick={handleMarkDone}>
              <Check className="h-4 w-4 mr-2" />
              Marquer terminée
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Modifier
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
