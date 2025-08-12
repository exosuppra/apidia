import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Seo title="ApidIA | Accueil" description="Bienvenue sur ApidIA. Connectez-vous pour accéder à votre tableau de bord." canonical={`${window.location.origin}/`} />
      <div className="text-center max-w-xl space-y-4">
        <h1 className="text-4xl font-bold">Bienvenue sur ApidIA</h1>
        <p className="text-lg text-muted-foreground">Commencez par vous connecter pour accéder à votre espace.</p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/auth/login">Se connecter</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

