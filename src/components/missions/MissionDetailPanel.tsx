import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2, Merge, Upload, Trash2, Image, File, Calendar, Clock, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { logUserAction } from "@/lib/logUserAction";

interface MissionFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
  contentPreview?: string;
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
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        // Upload to Google Drive
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderName', folder.name);

        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: formData,
        });

        if (error || !data?.success) {
          console.error('Upload error:', error || data?.error);
          toast({
            title: "Erreur d'upload",
            description: `Impossible d'uploader ${file.name}: ${error?.message || data?.error}`,
            variant: "destructive",
          });
          continue;
        }

        newUploads.push({
          id: data.file.id,
          name: file.name,
          path: data.file.id, // Use Drive ID as path
          size: file.size,
          mimeType: file.type,
        });
      }

      if (newUploads.length > 0) {
        setUploadedJustificatifs(prev => [...prev, ...newUploads]);
        logUserAction("missions_upload_justificatif", { folder: folder.name, count: newUploads.length });
        toast({
          title: "Upload réussi",
          description: `${newUploads.length} fichier(s) ajouté(s) au Drive`,
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveUploadedFile = async (justificatif: UploadedJustificatif) => {
    // Simply remove from local state - file stays on Drive
    // Users can delete from Drive directly if needed
    setUploadedJustificatifs(prev => prev.filter(j => j.id !== justificatif.id));
    toast({
      title: "Fichier retiré de la liste",
      description: justificatif.name,
    });
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
      // All justificatifs are now on Drive, pass their IDs
      const allJustificatifIds = [
        ...selectedDriveJustificatifs.filter(id => id !== mainDocumentId),
        ...uploadedJustificatifs.map(j => j.id)
      ];

      const { data, error } = await supabase.functions.invoke('merge-mission-pdfs', {
        body: {
          folderName: folder.name,
          mainDocumentId,
          justificatifsIds: allJustificatifIds,
          uploadedJustificatifsUrls: [], // No longer using Supabase storage URLs
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la fusion');
      }

      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

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

      // Clear the uploaded justificatifs from local state (they stay on Drive)
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-green-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (mimeType === 'application/vnd.google-apps.document') {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const totalJustificatifs = selectedDriveJustificatifs.length + uploadedJustificatifs.length;

  return (
    <div className="space-y-6">
      {/* Documents list as detailed table */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Liste des Ordres de Mission
        </Label>
        
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Document</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Modifié le</TableHead>
                <TableHead className="text-right">Taille</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentFiles.map(file => (
                <>
                  <TableRow key={file.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.mimeType)}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[250px]">
                            {file.name}
                          </span>
                          <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                            {file.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc' : 'PDF'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(file.createdTime)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDateTime(file.createdTime)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(file.modifiedTime)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDateTime(file.modifiedTime)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {file.mimeType === 'application/vnd.google-apps.document' ? '—' : formatFileSize(file.size)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {file.contentPreview && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setExpandedPreview(expandedPreview === file.id ? null : file.id)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Aperçu du contenu</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedPreview === file.id && file.contentPreview && (
                    <TableRow key={`${file.id}-preview`}>
                      <TableCell colSpan={5} className="bg-muted/30 py-3">
                        <div className="text-xs text-muted-foreground italic px-2">
                          <span className="font-medium text-foreground">Aperçu : </span>
                          {file.contentPreview}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Collapsible merge options */}
      <Collapsible open={showMergeOptions} onOpenChange={setShowMergeOptions}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Merge className="h-4 w-4" />
              Fusionner les documents
            </span>
            {showMergeOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-4">
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
                        {getFileIcon(file.mimeType)}
                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                      </label>
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
                          {getFileIcon(file.mimeType)}
                          <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                        </label>
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

            {uploadedJustificatifs.length > 0 && (
              <div className="space-y-2 mt-3">
                {uploadedJustificatifs.map(justificatif => (
                  <div
                    key={justificatif.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(justificatif.mimeType)}
                      <span className="text-sm truncate max-w-[250px]">{justificatif.name}</span>
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
                <Download className="h-4 w-4 mr-2" />
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
            Le document fusionné contiendra l'ordre de mission suivi des justificatifs
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
