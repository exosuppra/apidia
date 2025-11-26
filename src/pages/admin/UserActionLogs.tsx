import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { History, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActionLog {
  id: string;
  user_email: string;
  user_id_sheet: string | null;
  action_type: string;
  action_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function UserActionLogs() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('user_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (searchEmail) {
      query = query.ilike('user_email', `%${searchEmail}%`);
    }

    if (filterAction !== 'all') {
      query = query.eq('action_type', filterAction);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [searchEmail, filterAction]);

  const getActionBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      login: 'bg-blue-500',
      logout: 'bg-gray-500',
      view_fiches: 'bg-green-500',
      request_update: 'bg-orange-500',
      set_code: 'bg-purple-500',
      view_details: 'bg-cyan-500',
    };

    const labels: Record<string, string> = {
      login: 'Connexion',
      logout: 'Déconnexion',
      view_fiches: 'Consultation fiches',
      request_update: 'Demande modif',
      set_code: 'Code défini',
      view_details: 'Détails vus',
    };

    return (
      <Badge className={colors[actionType] || 'bg-gray-500'}>
        {labels[actionType] || actionType}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="w-8 h-8" />
          Historique des actions
        </h1>
        <p className="text-muted-foreground mt-2">
          Suivez toutes les actions effectuées par les utilisateurs Google Sheets
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="login">Connexion</SelectItem>
                <SelectItem value="logout">Déconnexion</SelectItem>
                <SelectItem value="view_fiches">Consultation fiches</SelectItem>
                <SelectItem value="request_update">Demande de modification</SelectItem>
                <SelectItem value="set_code">Code défini</SelectItem>
                <SelectItem value="view_details">Détails consultés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune action à afficher
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">
                      {log.user_email}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(log.created_at), 'dd MMMM yyyy à HH:mm:ss', { locale: fr })}
                    </CardDescription>
                  </div>
                  {getActionBadge(log.action_type)}
                </div>
              </CardHeader>
              {log.action_details && (
                <CardContent>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Voir les détails
                    </summary>
                    <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(log.action_details, null, 2)}
                    </pre>
                  </details>
                  {log.ip_address && (
                    <p className="text-xs text-muted-foreground mt-2">
                      IP: {log.ip_address}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}