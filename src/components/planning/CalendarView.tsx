import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronLeft, ChevronRight, Check, Edit2, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import type { Task, Tag } from "@/types/planning";

interface CalendarViewProps {
  tasks: Task[];
  tags: Tag[];
  onRefresh: () => void;
  onDateDoubleClick?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}

interface DraggableTaskProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  onMarkDone: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function DraggableTask({ task, onTaskClick, onMarkDone, onDelete }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isDone = task.status === "done";

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`text-xs p-0.5 rounded truncate cursor-grab hover:opacity-90 transition-all duration-200 hover:shadow-sm relative overflow-visible ${
            isDragging ? "opacity-50 shadow-lg" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick?.(task);
          }}
        >
          {task.validation_status === "validated" && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          )}
          {task.validation_status === "rejected" && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
          {!task.validation_status && task.has_unseen_update && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          )}
          <div
            className={`rounded px-1 py-0.5 relative overflow-hidden text-[11px] leading-tight ${isDone ? "line-through" : ""}`}
            style={{
              backgroundColor: task.tags?.[0]?.color || "#3b82f6",
              color: "white",
            }}
            title={task.title}
          >
            {isDone && (
              <div 
                className="absolute inset-0 bg-gray-500/50 pointer-events-none"
                aria-hidden="true"
              />
            )}
            <span className="relative">{task.title}</span>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {task.status !== "done" && (
          <ContextMenuItem onClick={() => onMarkDone(task)}>
            <Check className="h-4 w-4 mr-2" />
            Marquer terminée
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onTaskClick?.(task)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Modifier
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete(task)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface DroppableDayProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  onDateDoubleClick?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
  onMarkDone: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function DroppableDay({ day, isCurrentMonth, isToday, tasks, onDateDoubleClick, onTaskClick, onMarkDone, onDelete }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
    data: { day },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`min-h-[90px] p-1.5 cursor-pointer transition-all duration-300 hover:bg-accent/50 hover:shadow-md ${
        !isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""
      } ${isToday ? "border-primary border-2 ring-2 ring-primary/20" : ""} ${
        isOver ? "bg-primary/10 border-primary" : ""
      }`}
      onDoubleClick={() => onDateDoubleClick?.(day)}
    >
      <div className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : ""}`}>
        {format(day, "d")}
      </div>
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            onMarkDone={onMarkDone}
            onDelete={onDelete}
          />
        ))}
      </div>
    </Card>
  );
}

export function CalendarView({ tasks, tags, onRefresh, onDateDoubleClick, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const handleMarkDone = async (task: Task) => {
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

  const handleDelete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks" as any)
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tâche supprimée",
        description: "La tâche a été supprimée.",
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const newDate = new Date(over.id as string);
    
    // Keep the same time, just change the date
    if (task.due_date) {
      const oldDate = new Date(task.due_date);
      newDate.setHours(oldDate.getHours());
      newDate.setMinutes(oldDate.getMinutes());
    }

    try {
      const { error } = await supabase
        .from("tasks" as any)
        .update({ due_date: newDate.toISOString() })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tâche déplacée",
        description: `Tâche déplacée au ${format(newDate, "d MMMM", { locale: fr })}`,
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={prevMonth}
              className="transition-all hover:scale-110"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center capitalize transition-all">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </h2>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={nextMonth}
              className="transition-all hover:scale-110"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={today}
            className="transition-all hover:scale-105"
          >
            Aujourd'hui
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted-foreground py-3 bg-muted/30 rounded"
            >
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <DroppableDay
                key={index}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                tasks={dayTasks}
                onDateDoubleClick={onDateDoubleClick}
                onTaskClick={onTaskClick}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div
            className="text-xs p-1.5 rounded shadow-lg opacity-90"
            style={{
              backgroundColor: activeTask.tags?.[0]?.color || "#3b82f6",
              color: "white",
            }}
          >
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
