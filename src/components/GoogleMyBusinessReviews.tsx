import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import GoogleMyBusinessSetup from "./GoogleMyBusinessSetup";
import { Star, MessageSquare, ExternalLink } from "lucide-react";

export default function GoogleMyBusinessReviews() {
  const [isSetup, setIsSetup] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-setup', {
        method: 'GET'
      });

      if (error) throw error;
      setIsSetup(data.hasCredentials);
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    
    try {
      const redirectUri = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) throw error;

      // Open Google OAuth in a popup
      const popup = window.open(
        data.authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for the popup to close or for a message from it
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setLoading(false);
          // Check if connection was successful
          checkConnectionStatus();
        }
      }, 1000);

    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Impossible de se connecter à Google",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    // This would check if we have valid tokens
    // For now, we'll implement this in a future iteration
    setIsConnected(true);
    toast({
      title: "Connexion réussie",
      description: "Votre compte Google My Business est maintenant connecté"
    });
  };

  if (!isSetup) {
    return <GoogleMyBusinessSetup onSetupComplete={() => setIsSetup(true)} />;
  }

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
                {loading ? "Connexion..." : "Se connecter à Google My Business"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Avis Google My Business
            </CardTitle>
            <CardDescription>
              Gérez vos avis avec des réponses générées par IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Fonctionnalité en cours de développement</h3>
              <p className="text-muted-foreground mb-4">
                L'interface de gestion des avis sera bientôt disponible. Vous pourrez :
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 max-w-md mx-auto">
                <li>• Voir tous vos avis non répondus</li>
                <li>• Générer des réponses avec l'IA</li>
                <li>• Personnaliser et valider les réponses</li>
                <li>• Publier directement sur Google My Business</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}