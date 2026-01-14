import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VerificationProgress {
  current_run_id: string | null;
  current_run_status: string;
  current_run_total: number;
  current_run_verified: number;
  current_run_errors: number;
  current_run_started_at: string | null;
  current_run_completed_at: string | null;
}

interface VerificationProgressCardProps {
  onComplete?: () => void;
}

export default function VerificationProgressCard({ onComplete }: VerificationProgressCardProps) {
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const loadProgress = async () => {
    const { data, error } = await supabase
      .from("verification_config")
      .select("current_run_id, current_run_status, current_run_total, current_run_verified, current_run_errors, current_run_started_at, current_run_completed_at")
      .limit(1)
      .single();

    if (!error && data) {
      const progressData = data as VerificationProgress;
      setProgress(progressData);
      
      // Afficher si en cours ou terminé récemment (moins de 10 secondes)
      const isRunning = progressData.current_run_status === "running";
      const isRecentlyCompleted = progressData.current_run_status === "completed" && 
        progressData.current_run_completed_at && 
        (new Date().getTime() - new Date(progressData.current_run_completed_at).getTime()) < 10000;
      
      setIsVisible(isRunning || isRecentlyCompleted);

      // Appeler onComplete quand la vérification se termine
      if (progressData.current_run_status === "completed" && isRecentlyCompleted) {
        onComplete?.();
      }
    }
  };

  useEffect(() => {
    loadProgress();

    // Polling toutes les 2 secondes quand visible
    const interval = setInterval(() => {
      loadProgress();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-hide après complétion
  useEffect(() => {
    if (progress?.current_run_status === "completed" && progress.current_run_completed_at) {
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      return () => clearTimeout(hideTimeout);
    }
  }, [progress?.current_run_status, progress?.current_run_completed_at]);

  if (!isVisible || !progress) {
    return null;
  }

  const isRunning = progress.current_run_status === "running";
  const isCompleted = progress.current_run_status === "completed";
  const processed = progress.current_run_verified + progress.current_run_errors;
  const progressPercent = progress.current_run_total > 0 
    ? Math.round((processed / progress.current_run_total) * 100) 
    : 0;

  const getElapsedTime = () => {
    if (!progress.current_run_started_at) return "";
    const start = new Date(progress.current_run_started_at);
    const end = progress.current_run_completed_at 
      ? new Date(progress.current_run_completed_at) 
      : new Date();
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className={`mb-6 border-2 ${isRunning ? 'border-primary/50 bg-primary/5' : 'border-green-500/50 bg-green-500/5'} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <div className="p-2 rounded-full bg-primary/10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {isRunning ? "Vérification en cours..." : "Vérification terminée"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRunning 
                    ? `Analyse via l'agent IA ApidIA`
                    : `Terminée en ${getElapsedTime()}`
                  }
                </p>
              </div>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{getElapsedTime()}</span>
              </div>
            )}
            {isCompleted && (
              <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                Fermer
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progression
              </span>
              <span className="font-medium">
                {processed} / {progress.current_run_total} fiches ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Vérifiées:</span>
              <span className="font-medium text-green-600">{progress.current_run_verified}</span>
            </div>
            {progress.current_run_errors > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">Erreurs:</span>
                <span className="font-medium text-red-600">{progress.current_run_errors}</span>
              </div>
            )}
            {isRunning && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">
                  ~{Math.ceil((progress.current_run_total - processed) * 1.5 / 60)} min restantes
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
