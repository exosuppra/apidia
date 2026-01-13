import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2, Merge, X, Upload, Trash2, Image, File } from "lucide-react";

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

interface UploadedJustificatif {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
}

interface MissionDetailPanelProps {
  folder: MissionFolder;
  onClose: () => void;
}

export default function MissionDetailPanel({ folder, onClose }: MissionDetailPanelProps) {
  const [mainDocumentId, setMainDocumentId] = useState<string>("");
  const [selectedDriveJustificatifs, setSelectedDriveJustificatifs] = useState<string[]>([]);
  const [uploadedJustificatifs, setUploadedJustificatifs] = useState<UploadedJustificatif[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Accept both PDFs and Google Docs
  const documentFiles = folder.files.filter(f => 
    f.mimeType === 'application/pdf' || f.mimeType === 'application/vnd.google-apps.document'
  );

  const handleDriveJustificatifToggle = (fileId: string) => {
    setSelectedDriveJustificatifs(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUploads: UploadedJustificatif[] = [];

    try {
      for (const file of Array.from(files)) {
        // Create unique path: folderName/timestamp_filename
        const sanitizedFolderName = folder.name.replace(/[^a-zA-Z0-9-_]/g, '_');
        const timestamp = Date.now();
        const filePath = `${sanitizedFolderName}/${timestamp}_${file.name}`;

        const { data, error } = await supabase.storage
          .from('mission-justificatifs')
          .upload(filePath, file);

        if (error) {
          console.error('Upload error:', error);
          toast({
            title: "Erreur d'upload",
            description: `Impossible d'uploader ${file.name}: ${error.message}`,
            variant: "destructive",
          });
          continue;
        }

        newUploads.push({
          id: data.path,
          name: file.name,
          path: data.path,
          size: file.size,
          mimeType: file.type,
        });
      }

      if (newUploads.length > 0) {
        setUploadedJustificatifs(prev => [...prev, ...newUploads]);
        toast({
          title: "Upload réussi",
          description: `${newUploads.length} fichier(s) uploadé(s)`,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload des fichiers",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveUploadedFile = async (justificatif: UploadedJustificatif) => {
    try {
      const { error } = await supabase.storage
        .from('mission-justificatifs')
        .remove([justificatif.path]);

      if (error) throw error;

      setUploadedJustificatifs(prev => prev.filter(j => j.id !== justificatif.id));
      toast({
        title: "Fichier supprimé",
        description: justificatif.name,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
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
      // Get signed URLs for uploaded justificatifs
      const uploadedUrls: string[] = [];
      for (const justificatif of uploadedJustificatifs) {
        const { data } = await supabase.storage
          .from('mission-justificatifs')
          .createSignedUrl(justificatif.path, 3600); // 1 hour validity
        
        if (data?.signedUrl) {
          uploadedUrls.push(data.signedUrl);
        }
      }

      const { data, error } = await supabase.functions.invoke('merge-mission-pdfs', {
        body: {
          folderName: folder.name,
          mainDocumentId,
          justificatifsIds: selectedDriveJustificatifs.filter(id => id !== mainDocumentId),
          uploadedJustificatifsUrls: uploadedUrls,
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

      // Clean up uploaded files after successful merge
      for (const justificatif of uploadedJustificatifs) {
        await supabase.storage
          .from('mission-justificatifs')
          .remove([justificatif.path]);
      }
      setUploadedJustificatifs([]);

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-green-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const totalJustificatifs = selectedDriveJustificatifs.length + uploadedJustificatifs.length;

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg uppercase">{folder.name}</CardTitle>
            <CardDescription>
              {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''}
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
            1. Document principal (Ordre de Mission)
          </Label>
          <RadioGroup value={mainDocumentId} onValueChange={setMainDocumentId}>
            <div className="space-y-2">
              {documentFiles.map(file => (
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
                      <FileText className={`h-4 w-4 ${file.mimeType === 'application/pdf' ? 'text-red-500' : 'text-blue-500'}`} />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {file.mimeType === 'application/vnd.google-apps.document' ? 'Doc' : formatFileSize(file.size)}
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

        {/* Drive Justificatifs selection */}
        {documentFiles.filter(file => file.id !== mainDocumentId).length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              2. Justificatifs depuis Drive (optionnel)
            </Label>
            <div className="space-y-2">
              {documentFiles
                .filter(file => file.id !== mainDocumentId)
                .map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`just-${file.id}`}
                        checked={selectedDriveJustificatifs.includes(file.id)}
                        onCheckedChange={() => handleDriveJustificatifToggle(file.id)}
                      />
                      <label 
                        htmlFor={`just-${file.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className={`h-4 w-4 ${file.mimeType === 'application/pdf' ? 'text-red-500' : 'text-blue-500'}`} />
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {file.mimeType === 'application/vnd.google-apps.document' ? 'Doc' : formatFileSize(file.size)}
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
          </div>
        )}

        {/* Upload Justificatifs */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            3. Uploader des justificatifs
          </Label>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
          />
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Ajouter des justificatifs (PDF, images)
              </>
            )}
          </Button>

          {/* Uploaded files list */}
          {uploadedJustificatifs.length > 0 && (
            <div className="space-y-2 mt-3">
              {uploadedJustificatifs.map(justificatif => (
                <div
                  key={justificatif.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(justificatif.mimeType)}
                    <span className="text-sm truncate max-w-[180px]">{justificatif.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(justificatif.size)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveUploadedFile(justificatif)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {totalJustificatifs > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {1 + totalJustificatifs} documents
                </Badge>
              )}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Le document fusionné contiendra l'ordre de mission suivi des justificatifs sélectionnés et uploadés
        </p>
      </CardContent>
    </Card>
  );
}
