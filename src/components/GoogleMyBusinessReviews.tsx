import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";

export default function GoogleMyBusinessReviews() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleConnect = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/business.manage',
          redirectTo: `${window.location.origin}/dashboard`
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