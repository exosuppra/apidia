import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import MissionFolderCard from "@/components/missions/MissionFolderCard";
import MissionDetailPanel from "@/components/missions/MissionDetailPanel";
import { ArrowLeft, Search, RefreshCw, Loader2, FolderOpen, Briefcase } from "lucide-react";
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

export default function SuiviMissions() {
  const [folders, setFolders] = useState<MissionFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<MissionFolder | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-missions-data');

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la récupération des données');
      }

      setFolders(data.folders || []);
      logUserAction("missions_refresh", { folders_count: data.folders?.length || 0 });
    } catch (error: any) {
      console.error('Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les dossiers de mission",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBackToFolders = () => {
    setSelectedFolder(null);
  };

  return (
    <>
      <Seo 
        title="Suivi des Ordres de Mission"
        description="Gestion des ordres de mission et frais associés"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedFolder ? handleBackToFolders : () => navigate('/admin/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {selectedFolder ? "Dossiers" : "Retour"}
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {selectedFolder ? selectedFolder.name : "Ordres de Mission"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedFolder 
                      ? `${selectedFolder.files.length} document${selectedFolder.files.length > 1 ? 's' : ''}`
                      : "Gestion des ordres et frais de mission"
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {!selectedFolder && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchMissions}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            )}
          </div>

          {/* Content: Either folders grid OR document list */}
          {selectedFolder ? (
            // Document list view (full width)
            <MissionDetailPanel 
              folder={selectedFolder}
              onClose={handleBackToFolders}
            />
          ) : (
            // Folders grid view
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un dossier de mission..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Loading state */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? "Aucun dossier ne correspond à votre recherche"
                      : "Aucun dossier de mission trouvé"
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFolders.map(folder => (
                    <MissionFolderCard
                      key={folder.id}
                      folder={folder}
                      isSelected={false}
                      onClick={() => setSelectedFolder(folder)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
