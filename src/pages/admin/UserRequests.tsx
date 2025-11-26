import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserRequest {
  id: string;
  user_email: string;
  fiche_id: string;
  original_data: any;
  requested_changes: any;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export default function UserRequests() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('user_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Si approuvé, envoyer vers Make webhook
      if (newStatus === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;
          if (MAKE_WEBHOOK_URL) {
            await fetch(MAKE_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_fiche',
                id: request.fiche_id,
                email: request.user_email,
                changes: request.requested_changes,
                original: request.original_data,
                approved_at: new Date().toISOString(),
              }),
            });
          }
        }
      }

      toast({
        title: "Succès",
        description: `Demande ${newStatus === 'approved' ? 'approuvée' : 'refusée'}`,
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> En attente</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Refusée</Badge>;
      default:
        return null;
    }
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return requests;
    return requests.filter(r => r.status === status);
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
          <FileText className="w-8 h-8" />
          Demandes utilisateurs
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez les demandes de modification des fiches
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">En attente ({filterByStatus('pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approuvées ({filterByStatus('approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Refusées ({filterByStatus('rejected').length})</TabsTrigger>
          <TabsTrigger value="all">Toutes ({requests.length})</TabsTrigger>
        </TabsList>

        {['pending', 'approved', 'rejected', 'all'].map(status => (
          <TabsContent key={status} value={status} className="space-y-4 mt-4">
            {filterByStatus(status).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune demande à afficher
                </CardContent>
              </Card>
            ) : (
              filterByStatus(status).map(request => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Fiche #{request.fiche_id}</CardTitle>
                        <CardDescription>
                          Demandé par {request.user_email} le {format(new Date(request.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Modifications demandées :</h4>
                        <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                          {JSON.stringify(request.requested_changes, null, 2)}
                        </pre>
                      </div>

                      {selectedRequest?.id === request.id && request.status === 'pending' && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Notes administrateur (optionnel)
                            </label>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Ajoutez des notes sur cette demande..."
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleProcess(request.id, 'approved')}
                              disabled={processing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approuver
                            </Button>
                            <Button
                              onClick={() => handleProcess(request.id, 'rejected')}
                              disabled={processing}
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Refuser
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedRequest(null);
                                setAdminNotes("");
                              }}
                              variant="outline"
                              disabled={processing}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}

                      {request.status === 'pending' && selectedRequest?.id !== request.id && (
                        <Button
                          onClick={() => setSelectedRequest(request)}
                          variant="outline"
                          size="sm"
                        >
                          Traiter cette demande
                        </Button>
                      )}

                      {request.admin_notes && (
                        <div className="bg-muted/50 p-3 rounded">
                          <p className="text-sm font-medium mb-1">Notes admin :</p>
                          <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                        </div>
                      )}

                      {request.processed_at && (
                        <p className="text-xs text-muted-foreground">
                          Traité le {format(new Date(request.processed_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}