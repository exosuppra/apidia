import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileJson, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logUserAction } from "@/lib/logUserAction";

interface ImportResult {
  fiche_id: string;
  status: "imported" | "skipped" | "error";
  name?: string;
}

interface ImportStats {
  imported: number;
  skipped: number;
  errors: string[];
  details: ImportResult[];
}

export default function ImportFiches() {
  const [files, setFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportStats | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/json" || file.name.endsWith(".json")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
    setResults(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/json" || file.name.endsWith(".json")
      );
      setFiles((prev) => [...prev, ...selectedFiles]);
      setResults(null);
    }
  }, []);

  const clearFiles = () => {
    setFiles([]);
    setResults(null);
    setProgress(0);
  };

  const importFiles = async () => {
    if (files.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    setResults(null);

    const batchSize = 10;
    const batches: File[][] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    setTotalBatches(batches.length);

    const aggregatedResults: ImportStats = {
      imported: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    for (let i = 0; i < batches.length; i++) {
      setCurrentBatch(i + 1);
      const batch = batches[i];

      try {
        // Parse all JSON files in this batch
        const fiches = await Promise.all(
          batch.map(async (file) => {
            const text = await file.text();
            try {
              return JSON.parse(text);
            } catch {
              return null;
            }
          })
        );

        // Filter out invalid JSON
        const validFiches = fiches.filter((f) => f !== null);

        if (validFiches.length > 0) {
          const { data, error } = await supabase.functions.invoke("import-fiches", {
            body: { fiches: validFiches },
          });

          if (error) {
            console.error("Import error:", error);
            aggregatedResults.errors.push(`Lot ${i + 1}: ${error.message}`);
          } else if (data) {
            aggregatedResults.imported += data.imported || 0;
            aggregatedResults.skipped += data.skipped || 0;
            aggregatedResults.errors.push(...(data.errors || []));
            aggregatedResults.details.push(...(data.details || []));
          }
        }
      } catch (err: any) {
        console.error("Batch error:", err);
        aggregatedResults.errors.push(`Lot ${i + 1}: ${err.message}`);
      }

      setProgress(((i + 1) / batches.length) * 100);
    }

    setResults(aggregatedResults);
    setIsImporting(false);

    if (aggregatedResults.imported > 0) {
      toast.success(`${aggregatedResults.imported} fiches importées avec succès`);
      logUserAction("import_fiches", { imported: aggregatedResults.imported, skipped: aggregatedResults.skipped, errors: aggregatedResults.errors.length });
    }
    if (aggregatedResults.errors.length > 0) {
      toast.error(`${aggregatedResults.errors.length} erreurs rencontrées`);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/fiches")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import de fiches JSON</h1>
          <p className="text-muted-foreground mt-1">
            Importez vos fichiers JSON exportés depuis Apidae
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner les fichiers</CardTitle>
          <CardDescription>
            Glissez-déposez vos fichiers JSON ou cliquez pour les sélectionner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              Glissez vos fichiers JSON ici
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou cliquez pour parcourir
            </p>
            <input
              id="file-input"
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-primary" />
                  <span className="font-medium">{files.length} fichiers sélectionnés</span>
                </div>
                <Button variant="outline" size="sm" onClick={clearFiles}>
                  Effacer
                </Button>
              </div>

              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      {file.name}
                      <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button 
                onClick={importFiles} 
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours... (Lot {currentBatch}/{totalBatches})
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer {files.length} fichiers
                  </>
                )}
              </Button>

              {isImporting && (
                <Progress value={progress} className="h-2" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats de l'import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-500">{results.imported}</p>
                  <p className="text-sm text-muted-foreground">Importées</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{results.skipped}</p>
                  <p className="text-sm text-muted-foreground">Ignorées (déjà présentes)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-500">{results.errors.length}</p>
                  <p className="text-sm text-muted-foreground">Erreurs</p>
                </div>
              </div>
            </div>

            {results.details.length > 0 && (
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {results.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {detail.status === "imported" && (
                        <Badge variant="default" className="bg-green-500">Importé</Badge>
                      )}
                      {detail.status === "skipped" && (
                        <Badge variant="secondary">Ignoré</Badge>
                      )}
                      {detail.status === "error" && (
                        <Badge variant="destructive">Erreur</Badge>
                      )}
                      <span className="font-mono text-xs">{detail.fiche_id}</span>
                      {detail.name && (
                        <span className="text-muted-foreground truncate">- {detail.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {results.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="font-medium text-destructive mb-2">Erreurs détaillées :</p>
                <ScrollArea className="h-24">
                  {results.errors.map((error, idx) => (
                    <p key={idx} className="text-sm text-destructive">{error}</p>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
