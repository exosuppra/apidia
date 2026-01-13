import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface MissionFolderCardProps {
  folder: MissionFolder;
  isSelected: boolean;
  onClick: () => void;
}

export default function MissionFolderCard({ folder, isSelected, onClick }: MissionFolderCardProps) {
  const pdfCount = folder.files.filter(f => f.mimeType === 'application/pdf').length;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-sm font-medium truncate">
              {folder.name}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="flex-shrink-0">
            {pdfCount} PDF
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{folder.files.length} fichier{folder.files.length > 1 ? 's' : ''}</span>
          </div>
          {folder.modifiedTime && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(folder.modifiedTime), 'd MMM yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
