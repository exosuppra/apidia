import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Clock, RefreshCw, StopCircle, AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";

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
  onSyncStatusChange?: (isRunning: boolean) => void;
}

// Seuil pour considérer la sync comme bloquée (8 minutes sans progrès apparent)
const STALE_THRESHOLD_MS = 8 * 60 * 1000;

export default function ApidaeSyncProgressCard({ onComplete, onSyncStatusChange }: ApidaeSyncProgressCardProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const manuallyStopped = useRef(false);
  // Track last known synced count to detect stale state
  const lastSyncedRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(Date.now());

  const loadProgress = async () => {
    const { data, error } = await supabase
      .from("apidae_sync_config")
      .select("current_sync_status, current_sync_total, current_sync_synced, current_sync_batch, current_sync_started_at, current_sync_completed_at")
      .limit(1)
      .single();

    if (!error && data) {
      const progressData = data as SyncProgress;
      
      // Track progress changes to detect stale state
      const newSynced = progressData.current_sync_synced || 0;
      if (newSynced !== lastSyncedRef.current) {
        lastSyncedRef.current = newSynced;
        lastProgressTimeRef.current = Date.now();
      }

      setProgress(progressData);
      
      const isRunning = progressData.current_sync_status === "running";
      const isRecentlyCompleted = progressData.current_sync_status === "completed" && 
        progressData.current_sync_completed_at && 
        (new Date().getTime() - new Date(progressData.current_sync_completed_at).getTime()) < 10000;
      
      setIsVisible(isRunning || !!isRecentlyCompleted);
      onSyncStatusChange?.(isRunning);

      if (progressData.current_sync_status === "completed" && isRecentlyCompleted) {
        onComplete?.();
      }

      if (progressData.current_sync_status === "completed" || progressData.current_sync_status === "idle") {
        manuallyStopped.current = false;
      }
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    manuallyStopped.current = true;
    try {
      const { data: configData } = await supabase
        .from("apidae_sync_config")
        .select("id")
        .limit(1)
        .single();

      if (!configData?.id) throw new Error("Config not found");

      const { error } = await supabase
        .from("apidae_sync_config")
        .update({
          current_sync_status: "interrupted",
          current_sync_completed_at: new Date().toISOString(),
        })
        .eq("id", configData.id);

      if (error) throw error;

      toast.success("Synchronisation Apidae arrêtée");
      await loadProgress();
      onComplete?.();
    } catch (error: any) {
      console.error("Error stopping sync:", error);
      toast.error("Erreur lors de l'arrêt de la synchronisation");
    } finally {
      setIsStopping(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cron-apidae-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ force: true }),
        }
      );
      
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      
      lastProgressTimeRef.current = Date.now();
      toast.success("Synchronisation relancée");
      await loadProgress();
    } catch (error: any) {
      console.error("Error resuming sync:", error);
      toast.error("Erreur lors de la relance : " + error.message);
    } finally {
      setIsResuming(false);
    }
  };

  useEffect(() => {
    loadProgress();
    const interval = setInterval(() => {
      loadProgress();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
  const isInterrupted = progress.current_sync_status === "interrupted";
  const synced = progress.current_sync_synced || 0;
  const total = progress.current_sync_total || 0;
  const progressPercent = total > 0 ? Math.round((synced / total) * 100) : 0;

  // Detect stale sync: running but no progress for > 8 minutes
  const isStale = isRunning && (Date.now() - lastProgressTimeRef.current) > STALE_THRESHOLD_MS;

  const getElapsedTime = () => {
    if (!progress.current_sync_started_at) return "";
    const start = new Date(progress.current_sync_started_at);
    const end = progress.current_sync_completed_at 
      ? new Date(progress.current_sync_completed_at) 
      : new Date();
    const totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Better estimate: only use the last few minutes of speed, not from start
  // This avoids absurd "2483 min remaining" when sync was paused for hours
  const getEstimatedRemaining = () => {
    if (!isRunning || synced === 0 || total === 0) return null;
    
    // If stale, don't show estimate
    if (isStale) return null;
    
    const remaining = total - synced;
    
    // Use time since last known progress update vs synced count
    // For a rough estimate: assume ~200 fiches per batch of 50s
    const fichesPerMinute = synced > 0 && progress.current_sync_started_at
      ? synced / ((Date.now() - new Date(progress.current_sync_started_at).getTime()) / 60000)
      : 0;
    
    if (fichesPerMinute <= 0) return null;
    
    const minutesLeft = Math.round(remaining / fichesPerMinute);
    if (minutesLeft > 60) return `~${Math.round(minutesLeft / 60)}h restantes`;
    return `~${minutesLeft} min restantes`;
  };

  const estimatedRemaining = getEstimatedRemaining();

  const cardBorder = isStale
    ? 'border-orange-500/50 bg-orange-500/5'
    : isRunning
    ? 'border-blue-500/50 bg-blue-500/5'
    : isInterrupted
    ? 'border-orange-500/50 bg-orange-500/5'
    : 'border-green-500/50 bg-green-500/5';

  return (
    <Card className={`mb-6 border-2 ${cardBorder} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isStale ? (
                <div className="p-2 rounded-full bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
              ) : isRunning ? (
                <div className="p-2 rounded-full bg-blue-500/10">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              ) : isInterrupted ? (
                <div className="p-2 rounded-full bg-orange-500/10">
                  <StopCircle className="h-5 w-5 text-orange-600" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {isStale
                    ? "Synchronisation interrompue (bloquée)"
                    : isRunning
                    ? "Synchronisation Apidae en cours..."
                    : isInterrupted
                    ? "Synchronisation interrompue"
                    : "Synchronisation terminée"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isStale
                    ? "Aucune progression détectée — cliquez sur Reprendre"
                    : isRunning
                    ? `Batch ${progress.current_sync_batch || 1} en cours`
                    : isInterrupted
                    ? "Arrêtée manuellement"
                    : `Terminée en ${getElapsedTime()}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isRunning || isStale) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{getElapsedTime()}</span>
                </div>
              )}
              {isStale && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResume}
                  disabled={isResuming}
                  className="gap-2 text-blue-600 border-blue-500/50 hover:bg-blue-500/10"
                >
                  {isResuming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Reprendre
                </Button>
              )}
              {isRunning && !isStale && (
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
              )}
              {(isCompleted || isInterrupted) && (
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
                {synced} / {total} fiches ({progressPercent}%)
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-3 ${isStale ? '[&>div]:bg-orange-500' : ''}`} 
            />
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Batch:</span>
              <span className="font-medium text-blue-600">{progress.current_sync_batch || 0}</span>
            </div>
            {estimatedRemaining && (
              <div className="ml-auto text-xs text-muted-foreground">
                <span>{estimatedRemaining}</span>
              </div>
            )}
            {isStale && (
              <div className="ml-auto text-xs text-orange-600 font-medium">
                ⚠ Sync bloquée depuis la dernière invocation — relance nécessaire
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
