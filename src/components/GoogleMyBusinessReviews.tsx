import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, ExternalLink } from "lucide-react";

export default function GoogleMyBusinessReviews() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.app_metadata?.provider === 'google') {
      setIsConnected(true);
      loadBusinesses();
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/business.manage',
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Redirection vers Google",
        description: "Vous allez être redirigé vers Google pour vous connecter"
      });

    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Impossible de se connecter à Google",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-business-reviews', {
        body: { action: 'getBusinesses' }
      });

      if (error) throw error;
      setBusinesses(data.businesses || []);
    } catch (error: any) {
      console.error('Error loading businesses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos fiches Google My Business",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Gestion des avis Google My Business
            </CardTitle>
            <CardDescription>
              Connectez-vous à votre compte Google pour gérer vos avis avec l'IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Connectez votre compte Google My Business pour commencer à gérer vos avis automatiquement avec l'intelligence artificielle.
              </p>
              
              <Button 
                onClick={handleGoogleConnect}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Connexion..." : "Se connecter avec Google"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Vos fiches Google My Business
            </CardTitle>
            <CardDescription>
              Gérez vos avis avec des réponses générées par IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {businesses.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chargement de vos fiches...</h3>
                <p className="text-muted-foreground">
                  Nous récupérons vos fiches Google My Business
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium">Vos établissements :</h3>
                {businesses.map((business: any, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{business.accountName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Type: {business.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}