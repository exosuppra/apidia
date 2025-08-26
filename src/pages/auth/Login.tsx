import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import Seo from "@/components/Seo";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/avis`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/business.manage'
        }
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="Connexion ApidIA | Google"
        description="Connectez-vous à ApidIA avec votre compte Google pour gérer vos avis Google My Business."
        canonical={`${window.location.origin}/auth/login`}
      />
      <main className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 mb-4">
              <img 
                src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
                alt="ApidIA Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl">ApidIA – Connexion</CardTitle>
            <CardDescription>
              Connectez-vous avec Google pour gérer vos avis Google My Business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Connexion..." : "Se connecter avec Google"}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>En vous connectant, vous autorisez ApidIA à accéder à vos établissements Google My Business</p>
            </div>
            
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
                ← Retour à l'accueil
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
