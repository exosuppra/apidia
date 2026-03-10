import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle, Clock, RefreshCw, StopCircle } from "lucide-react";
import { toast } from "sonner";

interface VerificationProgress {
  current_run_id: string | null;
  current_run_status: string;
  current_run_total: number;
  current_run_verified: number;
  current_run_errors: number;
  current_run_started_at: string | null;
  current_run_completed_at: string | null;
  current_run_current_fiche_id: string | null;
  current_run_current_index: number | null;
  current_run_last_heartbeat_at: string | null;
}

interface VerificationProgressCardProps {
  onComplete?: () => void;
}

export default function VerificationProgressCard({ onComplete }: VerificationProgressCardProps) {
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const loadProgress = async () => {
    const { data, error } = await supabase
      .from("verification_config")
      .select("current_run_id, current_run_status, current_run_total, current_run_verified, current_run_errors, current_run_started_at, current_run_completed_at, current_run_current_fiche_id, current_run_current_index, current_run_last_heartbeat_at")
      .limit(1)
      .single();

    if (!error && data) {
      const progressData = data as VerificationProgress;
      setProgress(progressData);
      
      const isRunning = progressData.current_run_status === "running";
      const isRecentlyCompleted = (progressData.current_run_status === "completed" || progressData.current_run_status === "interrupted") && 
        progressData.current_run_completed_at && 
        (new Date().getTime() - new Date(progressData.current_run_completed_at).getTime()) < 10000;
      
      setIsVisible(isRunning || isRecentlyCompleted);

      if ((progressData.current_run_status === "completed" || progressData.current_run_status === "interrupted") && isRecentlyCompleted) {
        onComplete?.();
      }
    }
  };

  // Manual resume (for interrupted runs only)
  const handleResume = async () => {
    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-all-fiches", {
        body: { resume: true },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Reprise en cours — traitement automatique en arrière-plan");
      } else {
        toast.error(data?.error || "Erreur lors de la reprise");
      }
    } catch (error: any) {
      console.error("Error resuming verification:", error);
      toast.error("Erreur lors de la reprise de la vérification");
    } finally {
      setIsResuming(false);
      loadProgress();
    }
  };

  // Stop verification
  const handleStop = async () => {
    setIsStopping(true);
    try {
      await supabase
        .from("verification_config")
        .update({
          current_run_status: "interrupted",
          current_run_completed_at: new Date().toISOString(),
        })
        .eq("current_run_id", progress?.current_run_id);
      
      toast.success("Vérification arrêtée");
      await loadProgress();
      onComplete?.();
    } catch (error: any) {
      console.error("Error stopping verification:", error);
      toast.error("Erreur lors de l'arrêt");
    } finally {
      setIsStopping(false);
    }
  };

  // Poll every 3 seconds (server handles progression autonomously)
  useEffect(() => {
    loadProgress();
    const interval = setInterval(loadProgress, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide after completion
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

  const isInterrupted = progress.current_run_status === "interrupted";
  const isRunning = progress.current_run_status === "running";
  const isCompleted = progress.current_run_status === "completed";
  const processed = progress.current_run_verified + progress.current_run_errors;
  const remaining = progress.current_run_total - processed;
  const progressPercent = progress.current_run_total > 0 
    ? Math.round((processed / progress.current_run_total) * 100) 
    : 0;

  const handleDismiss = async () => {
    if (isInterrupted) {
      await supabase
        .from("verification_config")
        .update({
          current_run_status: "idle",
          current_run_completed_at: new Date().toISOString(),
        })
        .eq("current_run_id", progress.current_run_id);
    }
    setIsVisible(false);
  };

  const getElapsedTime = () => {
    if (!progress.current_run_started_at) return "";
    const start = new Date(progress.current_run_started_at);
    const end = isInterrupted
      ? progress.current_run_last_heartbeat_at 
        ? new Date(progress.current_run_last_heartbeat_at)
        : new Date()
      : progress.current_run_completed_at 
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

  const cardClass = isInterrupted 
    ? 'border-orange-500/50 bg-orange-500/5' 
    : isRunning 
      ? 'border-primary/50 bg-primary/5' 
      : 'border-green-500/50 bg-green-500/5';

  return (
    <Card className={`mb-6 border-2 ${cardClass} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isInterrupted ? (
                <div className="p-2 rounded-full bg-orange-500/10">
                  <XCircle className="h-5 w-5 text-orange-600" />
                </div>
              ) : isRunning ? (
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
                  {isInterrupted 
                    ? "Vérification interrompue" 
                    : isRunning 
                      ? "Vérification en cours (arrière-plan)..." 
                      : "Vérification terminée"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isInterrupted 
                    ? `Arrêté à ${processed}/${progress.current_run_total} fiches - ${remaining} restantes`
                    : isRunning 
                      ? progress.current_run_current_fiche_id
                        ? `Fiche en cours: ${progress.current_run_current_fiche_id}`
                        : `Traitement automatique via l'agent IA ApidIA`
                      : `Terminée en ${getElapsedTime()}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{getElapsedTime()}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleStop}
                    disabled={isStopping}
                    className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                  >
                    {isStopping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <StopCircle className="h-4 w-4" />
                    )}
                    Arrêter
                  </Button>
                </>
              )}
              {isInterrupted && !isResuming && (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleResume}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reprendre ({remaining} fiches)
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDismiss}>
                    Ignorer
                  </Button>
                </>
              )}
              {isCompleted && (
                <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                  Fermer
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
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
            {isRunning && processed > 0 && progress.current_run_started_at && (
              <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
                <span>
                  ~{Math.round((new Date().getTime() - new Date(progress.current_run_started_at).getTime()) / 1000 / processed)}s/fiche
                </span>
                <span>
                  ~{(() => {
                    const elapsedSeconds = Math.floor((new Date().getTime() - new Date(progress.current_run_started_at).getTime()) / 1000);
                    const avgSecondsPerFiche = elapsedSeconds / processed;
                    const remainingMinutes = Math.ceil((remaining * avgSecondsPerFiche) / 60);
                    return remainingMinutes;
                  })()} min restantes
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
