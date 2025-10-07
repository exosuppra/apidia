import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, File, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TaskAttachment } from "@/types/planning";

interface FileUploadProps {
  taskId?: string;
  onFilesUploaded?: (attachments: TaskAttachment[]) => void;
  existingFiles?: TaskAttachment[];
}

export function FileUpload({ taskId, onFilesUploaded, existingFiles = [] }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(existingFiles);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !taskId) return;

    setUploading(true);
    try {
      const uploadedAttachments: TaskAttachment[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: attachment, error: dbError } = await supabase
          .from("task_attachments" as any)
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single() as any;

        if (dbError) throw dbError;

        uploadedAttachments.push(attachment);
      }

      setAttachments([...attachments, ...uploadedAttachments]);
      setFiles([]);
      onFilesUploaded?.(uploadedAttachments);

      toast({
        title: "Fichiers uploadés",
        description: `${files.length} fichier(s) ajouté(s) avec succès.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("task_attachments" as any)
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      setAttachments(attachments.filter((a) => a.id !== attachment.id));

      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <label htmlFor="file-upload">
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner des fichiers
            </span>
          </Button>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fichiers à uploader :</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-sm truncate flex-1">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemoveFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !taskId}
            size="sm"
          >
            {uploading ? "Upload en cours..." : "Upload"}
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fichiers joints :</p>
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <a
                href={getFileUrl(attachment.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm truncate flex-1 flex items-center gap-2 hover:underline"
              >
                {getFileIcon(attachment.mime_type)}
                {attachment.file_name}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDeleteAttachment(attachment)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
