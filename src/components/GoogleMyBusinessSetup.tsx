import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Settings } from "lucide-react";

interface GoogleMyBusinessSetupProps {
  onSetupComplete: () => void;
}

export default function GoogleMyBusinessSetup({ onSetupComplete }: GoogleMyBusinessSetupProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasCredentials, setHasCredentials] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingCredentials();
  }, []);

  const checkExistingCredentials = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-setup', {
        method: 'GET'
      });

      if (error) throw error;
      
      setHasCredentials(data.hasCredentials);
      if (data.hasCredentials) {
        onSetupComplete();
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-auth-setup', {
        body: { clientId: clientId.trim(), clientSecret: clientSecret.trim() }
      });

      if (error) throw error;

      toast({
        title: "Configuration sauvegardée",
        description: "Vos credentials Google ont été configurés avec succès"
      });

      onSetupComplete();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Erreur de configuration",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Vérification de la configuration...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasCredentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Google My Business configuré
          </CardTitle>
          <CardDescription>
            Votre intégration Google My Business est active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => setHasCredentials(false)}
            className="w-full"
          >
            Reconfigurer les credentials
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Google My Business</CardTitle>
        <CardDescription>
          Configurez vos credentials Google pour accéder à vos avis My Business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Instructions :</h4>
          <ol className="text-sm space-y-1 text-muted-foreground">
            <li>1. Allez sur <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
            <li>2. Créez un nouveau projet ou sélectionnez un projet existant</li>
            <li>3. Activez l'API "Google My Business API"</li>
            <li>4. Créez des credentials OAuth 2.0</li>
            <li>5. Copiez le Client ID et Client Secret ci-dessous</li>
          </ol>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Google Client ID</Label>
            <Input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Votre Google Client ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Google Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Votre Google Client Secret"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Configuration..." : "Configurer Google My Business"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}