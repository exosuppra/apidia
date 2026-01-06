import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Edit, 
  Plus,
  Bot,
  User,
  Clock,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChangeField {
  field: string;
  label: string;
  old_value: unknown;
  new_value: unknown;
}

interface HistoryEntry {
  id: string;
  fiche_id: string;
  action_type: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string;
  changes: ChangeField[] | { fields?: ChangeField[] } | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Helper to extract fields from changes (handles both array and object format)
const getChangesFields = (changes: HistoryEntry['changes']): ChangeField[] => {
  if (!changes) return [];
  if (Array.isArray(changes)) return changes;
  if (changes.fields && Array.isArray(changes.fields)) return changes.fields;
  return [];
};

// Helper to parse value (handles stringified JSON)
const parseValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    // Try to parse if it looks like JSON
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  }
  return value;
};

// Helper to format value for display - human readable
const formatValue = (rawValue: unknown): string => {
  const value = parseValue(rawValue);
  
  if (value === null || value === undefined) return '(vide)';
  if (typeof value === 'string') return value || '(vide)';
  
  if (Array.isArray(value)) {
    // Handle moyensCommunication array
    if (value.length > 0 && value[0]?.type?.libelleFr) {
      return value.map(item => {
        const type = item.type?.libelleFr || 'Contact';
        const coord = item.coordonnees?.fr || '';
        return `${type}: ${coord}`;
      }).join(', ');
    }
    
    // Handle periodesOuvertures array
    if (value.length > 0 && (value[0]?.dateDebut || value[0]?.type === 'OUVERTURE_SEMAINE')) {
      return value.map(item => {
        const debut = item.dateDebut || '';
        const fin = item.dateFin || '';
        const horaires = item.complementHoraire?.libelleFr || '';
        if (horaires) return horaires.replace(/\r\n/g, ' ').slice(0, 80);
        if (debut && fin) return `${debut} au ${fin}`;
        return `Période: ${debut || 'Non défini'}`;
      }).join(' | ');
    }
    
    return `${value.length} élément(s)`;
  }
  
  if (typeof value === 'object') {
    // Try to extract meaningful text
    const obj = value as Record<string, unknown>;
    if (obj.libelleFr) return String(obj.libelleFr);
    if (obj.fr) return String(obj.fr);
    return '(objet modifié)';
  }
  
  return String(value);
};

interface FicheHistoryPanelProps {
  ficheId: string;
}

export function FicheHistoryPanel({ ficheId }: FicheHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('fiche_history')
          .select('*')
          .eq('fiche_id', ficheId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory((data as HistoryEntry[]) || []);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [ficheId]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'publish':
        return <Eye className="h-4 w-4 text-green-600" />;
      case 'unpublish':
        return <EyeOff className="h-4 w-4 text-orange-600" />;
      case 'verify':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'manual_edit':
        return <Edit className="h-4 w-4 text-purple-600" />;
      case 'create':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'publish':
        return 'Fiche publiée';
      case 'unpublish':
        return 'Fiche masquée';
      case 'verify':
        return 'Vérification automatique';
      case 'manual_edit':
        return 'Modification manuelle';
      case 'create':
        return 'Fiche créée';
      case 'update':
        return 'Mise à jour';
      default:
        return actionType;
    }
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'system':
        return <Bot className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getActorBadgeVariant = (actorType: string): "default" | "secondary" | "outline" => {
    switch (actorType) {
      case 'system':
        return 'secondary';
      case 'admin':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucun historique disponible</p>
        <p className="text-xs mt-1">Les modifications seront enregistrées ici</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border-2 border-border">
                {getActionIcon(entry.action_type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-1.5 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {getActionLabel(entry.action_type)}
                  </span>
                  <Badge 
                    variant={getActorBadgeVariant(entry.actor_type)} 
                    className="text-xs flex items-center gap-1"
                  >
                    {getActorIcon(entry.actor_type)}
                    {entry.actor_name}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
                
                {/* Changes details */}
                {(() => {
                  const fields = getChangesFields(entry.changes);
                  if (fields.length === 0) return null;
                  return (
                    <div className="mt-2 space-y-1 bg-muted/50 rounded-lg p-3 text-xs">
                      {fields.map((change, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{change.label}</span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="line-through">{formatValue(change.old_value)}</span>
                            <span>→</span>
                            <span className="text-foreground font-medium">{formatValue(change.new_value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
