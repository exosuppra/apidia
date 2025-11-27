import { Card } from "@/components/ui/card";
import { TaskCard } from "./TaskCard";
import type { Task, Tag } from "@/types/planning";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: "todo" | "in_progress" | "done";
  onRefresh: () => void;
  tags: Tag[];
}

export function TaskColumn({ title, tasks, status, onRefresh, tags }: TaskColumnProps) {
  const getBgColor = () => {
    switch (status) {
      case "todo":
        return "bg-muted/50";
      case "in_progress":
        return "bg-primary/5";
      case "done":
        return "bg-green-500/5";
      default:
        return "bg-muted/50";
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="text-sm text-muted-foreground px-2 py-1 bg-background rounded-full transition-all">
          {tasks.length}
        </span>
      </div>
      <div className={`rounded-lg p-4 min-h-[400px] transition-colors duration-300 ${getBgColor()}`}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onRefresh={onRefresh}
              allTags={tags}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune tâche
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
