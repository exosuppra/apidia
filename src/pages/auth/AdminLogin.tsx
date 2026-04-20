import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logUserAction } from "@/lib/logUserAction";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { useAdminInterface, AdminInterface } from "@/hooks/useAdminInterface";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [interfaceChoice, setInterfaceChoice] = useAdminInterface();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si un admin est déjà connecté via Supabase Auth
    const checkAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Vérifier si l'utilisateur a le rôle admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();

        if (roles) {
          navigate("/admin/dashboard");
        }
      }
    };

    checkAdminSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Connexion via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Vérifier si l'utilisateur a le rôle admin
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .single();

      if (rolesError || !roles) {
        await supabase.auth.signOut();
        throw new Error("Vous n'avez pas les permissions d'administrateur.");
      }

      toast({
        title: "Connexion réussie",
        description: `Bienvenue — interface ${interfaceChoice === "refonte" ? "nouvelle" : "classique"}`,
      });

      logUserAction("login");
      navigate("/admin/dashboard");
    } catch (error: any) {
      // Traduire les messages d'erreur en français
      let errorMessage = "Identifiants invalides";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Veuillez confirmer votre email";
      } else if (error.message?.includes("User not found")) {
        errorMessage = "Utilisateur introuvable";
      } else if (error.message?.includes("permissions d'administrateur")) {
        errorMessage = error.message;
      }

      toast({
        title: "Erreur de connexion",
        description: errorMessage,
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

              {/* Sélecteur d'interface */}
              <InterfaceChooser value={interfaceChoice} onChange={setInterfaceChoice} />

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

/* ---------- Interface chooser ---------- */

interface InterfaceChooserProps {
  value: AdminInterface;
  onChange: (v: AdminInterface) => void;
}

function InterfaceChooser({ value, onChange }: InterfaceChooserProps) {
  const options: { k: AdminInterface; title: string; desc: string; badge?: string }[] = [
    { k: "refonte", title: "Nouvelle interface", desc: "Charte Pays de Manosque — layouts éditoriaux", badge: "Bêta" },
    { k: "classic", title: "Interface classique", desc: "Version précédente du back-office" },
  ];
  return (
    <div className="pt-2">
      <Label className="text-xs text-muted-foreground mb-2 block">Interface après connexion</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(o => {
          const active = value === o.k;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              className="relative text-left rounded-lg border p-3 transition-all"
              style={{
                borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
                background: active ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                boxShadow: active ? "0 0 0 2px hsl(var(--primary) / 0.2)" : "none",
                cursor: "pointer",
              }}
            >
              {o.badge && active && (
                <span
                  className="absolute -top-2 right-2 text-[9px] font-bold tracking-wider uppercase rounded-full px-2 py-[2px]"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {o.badge}
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{
                    background: active ? "hsl(var(--primary))" : "transparent",
                    border: "2px solid " + (active ? "hsl(var(--primary))" : "hsl(var(--border))"),
                  }}
                />
                <span className="text-sm font-semibold">{o.title}</span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
