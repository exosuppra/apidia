import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MessageCircle, Send, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Comment {
  id: string;
  task_id: string;
  author_name: string;
  author_email: string | null;
  content: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  tags?: Tag[];
  comments?: Comment[];
}

interface Planning {
  id: string;
  title: string;
  description: string | null;
}

export default function PublicPlanning() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentForm, setCommentForm] = useState({
    authorName: "",
    authorEmail: "",
    content: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      loadPlanning();
    }
  }, [token]);

  const loadPlanning = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke("get-public-planning", {
        body: null,
        headers: {},
        method: "GET",
      });

      // Use fetch directly since we need query params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/get-public-planning?token=${encodeURIComponent(token!)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du chargement");
      }

      setPlanning(data.planning);
      setTasks(data.tasks);
    } catch (err: any) {
      console.error("Error loading planning:", err);
      setError(err.message || "Planning non trouvé");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCommentDialog = (task: Task) => {
    setSelectedTask(task);
    setIsCommentDialogOpen(true);
  };

  const handleSubmitComment = async () => {
    if (!selectedTask || !commentForm.authorName.trim() || !commentForm.content.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir votre nom et votre commentaire",
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/add-task-comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId: selectedTask.id,
            authorName: commentForm.authorName.trim(),
            authorEmail: commentForm.authorEmail.trim() || null,
            content: commentForm.content.trim(),
            shareToken: token,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      toast({
        title: "Commentaire ajouté",
        description: "Votre retour a été enregistré avec succès",
      });

      // Update local state with new comment
      setTasks(tasks.map(t => 
        t.id === selectedTask.id 
          ? { ...t, comments: [...(t.comments || []), data.comment] }
          : t
      ));

      setCommentForm({ authorName: commentForm.authorName, authorEmail: commentForm.authorEmail, content: "" });
      setIsCommentDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement du planning...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erreur</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={`${planning?.title || "Planning"} - Calendrier éditorial`}
        description={planning?.description || "Consultez le planning éditorial"}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold">{planning?.title}</h1>
            {planning?.description && (
              <p className="text-muted-foreground mt-1">{planning.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Cliquez sur une tâche pour laisser un commentaire
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[200px] text-center capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={today}>
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
                  <Card
                    key={index}
                    className={`min-h-[140px] p-2 transition-all ${
                      !isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""
                    } ${isToday ? "border-primary border-2 ring-2 ring-primary/20" : ""}`}
                  >
                    <div className={`text-sm font-semibold mb-2 ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[100px]">
                      {dayTasks.map((task) => {
                        const isDone = task.status === "done";
                        const commentCount = task.comments?.length || 0;
                        
                        return (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-90 transition-all relative group ${
                              isDone ? "opacity-60 grayscale" : ""
                            }`}
                            onClick={() => handleOpenCommentDialog(task)}
                          >
                            <div
                              className={`rounded px-1.5 py-1 ${isDone ? "line-through" : ""}`}
                              style={{
                                backgroundColor: task.tags?.[0]?.color || "#3b82f6",
                                color: "white",
                              }}
                              title={task.title}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">{task.title}</span>
                                {commentCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] opacity-80">
                                    <MessageCircle className="h-3 w-3" />
                                    {commentCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task details */}
            {selectedTask?.description && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask?.tags && selectedTask.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTask.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Existing comments */}
            {selectedTask?.comments && selectedTask.comments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Commentaires ({selectedTask.comments.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedTask.comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMM à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add comment form */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Ajouter un commentaire</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Votre nom *"
                  value={commentForm.authorName}
                  onChange={(e) => setCommentForm({ ...commentForm, authorName: e.target.value })}
                  maxLength={100}
                />
                <Input
                  placeholder="Email (optionnel)"
                  type="email"
                  value={commentForm.authorEmail}
                  onChange={(e) => setCommentForm({ ...commentForm, authorEmail: e.target.value })}
                />
              </div>
              
              <Textarea
                placeholder="Votre commentaire..."
                value={commentForm.content}
                onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                rows={3}
                maxLength={2000}
              />
              
              <div className="flex justify-end">
                <Button onClick={handleSubmitComment} disabled={submitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
