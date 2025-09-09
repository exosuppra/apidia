import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si un admin est déjà connecté
    const adminSession = localStorage.getItem("admin_session");
    if (adminSession) {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Tentative de connexion admin directe...");
      
      // Vérification directe en base de données (temporaire pour débugger)
      const { data: adminUser, error: dbError } = await supabase
        .from("admin_users")
        .select("id, email, password_hash")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      console.log("Utilisateur trouvé:", { found: !!adminUser, error: dbError });

      if (dbError) {
        throw new Error("Erreur de base de données: " + dbError.message);
      }

      if (!adminUser) {
        throw new Error("Utilisateur admin non trouvé");
      }

      // Vérification du mot de passe avec RPC
      const { data: passwordValid, error: pwError } = await supabase
        .rpc("verify_admin_password", {
          input_password: password,
          stored_hash: adminUser.password_hash
        });

      console.log("Vérification mot de passe:", { valid: passwordValid, error: pwError });

      if (pwError) {
        throw new Error("Erreur de vérification: " + pwError.message);
      }

      if (!passwordValid) {
        throw new Error("Identifiants invalides");
      }

      // Connexion réussie
      localStorage.setItem("admin_session", JSON.stringify({
        admin: { id: adminUser.id, email: adminUser.email },
        sessionToken: crypto.randomUUID(),
        loginTime: Date.now()
      }));

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans l'interface administrateur",
      });

      navigate("/admin/dashboard");

    } catch (error: any) {
      console.error("Erreur de connexion admin:", error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiants invalides",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Seo 
        title="Connexion Administrateur"
        description="Accès à l'interface d'administration"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 mb-4">
              <img 
                src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
                alt="ApidIA Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Administration</CardTitle>
            <CardDescription>
              Connectez-vous avec vos identifiants administrateur
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}