import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2, Merge, X } from "lucide-react";

interface MissionFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
}

interface MissionFolder {
  id: string;
  name: string;
  files: MissionFile[];
  createdTime: string;
  modifiedTime: string;
}

interface MissionDetailPanelProps {
  folder: MissionFolder;
  onClose: () => void;
}

export default function MissionDetailPanel({ folder, onClose }: MissionDetailPanelProps) {
  const [mainDocumentId, setMainDocumentId] = useState<string>("");
  const [selectedJustificatifs, setSelectedJustificatifs] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const { toast } = useToast();

  const pdfFiles = folder.files.filter(f => f.mimeType === 'application/pdf');

  const handleJustificatifToggle = (fileId: string) => {
    setSelectedJustificatifs(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleMergeAndDownload = async () => {
    if (!mainDocumentId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un document principal (Ordre de Mission)",
        variant: "destructive",
      });
      return;
    }

    setIsMerging(true);

    try {
      const { data, error } = await supabase.functions.invoke('merge-mission-pdfs', {
        body: {
          folderName: folder.name,
          mainDocumentId,
          justificatifsIds: selectedJustificatifs.filter(id => id !== mainDocumentId)
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la fusion');
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: `PDF fusionné téléchargé (${data.pageCount} pages)`,
      });
    } catch (error: any) {
      console.error('Merge error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de fusionner les PDF",
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{folder.name}</CardTitle>
            <CardDescription>
              {pdfFiles.length} document{pdfFiles.length > 1 ? 's' : ''} PDF
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main document selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Document principal (Ordre de Mission)
          </Label>
          <RadioGroup value={mainDocumentId} onValueChange={setMainDocumentId}>
            <div className="space-y-2">
              {pdfFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={file.id} id={`main-${file.id}`} />
                    <label 
                      htmlFor={`main-${file.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Justificatifs selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Justificatifs de frais à inclure
          </Label>
          <div className="space-y-2">
            {pdfFiles
              .filter(file => file.id !== mainDocumentId)
              .map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`just-${file.id}`}
                      checked={selectedJustificatifs.includes(file.id)}
                      onCheckedChange={() => handleJustificatifToggle(file.id)}
                    />
                    <label 
                      htmlFor={`just-${file.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            {pdfFiles.filter(file => file.id !== mainDocumentId).length === 0 && mainDocumentId && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun autre document PDF dans ce dossier
              </p>
            )}
          </div>
        </div>

        {/* Merge button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleMergeAndDownload}
          disabled={!mainDocumentId || isMerging}
        >
          {isMerging ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fusion en cours...
            </>
          ) : (
            <>
              <Merge className="h-4 w-4 mr-2" />
              Fusionner et télécharger
              {selectedJustificatifs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {1 + selectedJustificatifs.length} PDF
                </Badge>
              )}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Le document fusionné contiendra l'ordre de mission suivi des justificatifs sélectionnés
        </p>
      </CardContent>
    </Card>
  );
}
