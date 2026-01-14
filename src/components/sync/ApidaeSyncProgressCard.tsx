import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Clock, RefreshCw } from "lucide-react";

interface SyncProgress {
  current_sync_status: string | null;
  current_sync_total: number | null;
  current_sync_synced: number | null;
  current_sync_batch: number | null;
  current_sync_started_at: string | null;
  current_sync_completed_at: string | null;
}

interface ApidaeSyncProgressCardProps {
  onComplete?: () => void;
}

export default function ApidaeSyncProgressCard({ onComplete }: ApidaeSyncProgressCardProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const loadProgress = async () => {
    const { data, error } = await supabase
      .from("apidae_sync_config")
      .select("current_sync_status, current_sync_total, current_sync_synced, current_sync_batch, current_sync_started_at, current_sync_completed_at")
      .limit(1)
      .single();

    if (!error && data) {
      const progressData = data as SyncProgress;
      setProgress(progressData);
      
      // Show if running or recently completed (less than 10 seconds)
      const isRunning = progressData.current_sync_status === "running";
      const isRecentlyCompleted = progressData.current_sync_status === "completed" && 
        progressData.current_sync_completed_at && 
        (new Date().getTime() - new Date(progressData.current_sync_completed_at).getTime()) < 10000;
      
      setIsVisible(isRunning || isRecentlyCompleted);

      // Call onComplete when sync finishes
      if (progressData.current_sync_status === "completed" && isRecentlyCompleted) {
        onComplete?.();
      }
    }
  };

  useEffect(() => {
    loadProgress();

    // Poll every 1 second when visible
    const interval = setInterval(() => {
      loadProgress();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-hide after completion
  useEffect(() => {
    if (progress?.current_sync_status === "completed" && progress.current_sync_completed_at) {
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      return () => clearTimeout(hideTimeout);
    }
  }, [progress?.current_sync_status, progress?.current_sync_completed_at]);

  if (!isVisible || !progress) {
    return null;
  }

  const isRunning = progress.current_sync_status === "running";
  const isCompleted = progress.current_sync_status === "completed";
  const synced = progress.current_sync_synced || 0;
  const total = progress.current_sync_total || 0;
  const progressPercent = total > 0 ? Math.round((synced / total) * 100) : 0;

  const getElapsedTime = () => {
    if (!progress.current_sync_started_at) return "";
    const start = new Date(progress.current_sync_started_at);
    const end = progress.current_sync_completed_at 
      ? new Date(progress.current_sync_completed_at) 
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
    <Card className={`mb-6 border-2 ${isRunning ? 'border-blue-500/50 bg-blue-500/5' : 'border-green-500/50 bg-green-500/5'} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <div className="p-2 rounded-full bg-blue-500/10">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {isRunning ? "Synchronisation Apidae en cours..." : "Synchronisation terminée"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRunning 
                    ? `Batch ${progress.current_sync_batch || 1} en cours`
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
                {synced} / {total} fiches ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Batch:</span>
              <span className="font-medium text-blue-600">{progress.current_sync_batch || 0}</span>
            </div>
            {isRunning && synced > 0 && progress.current_sync_started_at && (
              <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
                <span>
                  ~{Math.round((new Date().getTime() - new Date(progress.current_sync_started_at).getTime()) / 1000 / synced * (total - synced) / 60)} min restantes
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
