import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, KeyRound, Save, User as UserIcon } from "lucide-react";
import Seo from "@/components/Seo";
import { useTheme, themes, ThemeName } from "@/context/ThemeContext";

export default function Profile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const initialTab = params.get("tab") === "preferences" ? "preferences" : "profile";

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        navigate("/admin/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim() || null, last_name: lastName.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour" });
    }
  };

  return (
    <>
      <Seo title="Mon profil" description="Gérer mes informations personnelles et préférences" />
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <UserIcon className="h-6 w-6" />
                Mon profil
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Gérez vos informations personnelles et vos préférences
              </p>
            </div>
          </div>

          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="preferences">Préférences</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>Votre nom et email tels qu'affichés dans l'interface</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Prénom</Label>
                          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
                        </div>
                        <div>
                          <Label>Nom</Label>
                          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={email} disabled />
                        <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié ici.</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveProfile} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/auth/change-password")}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Changer mon mot de passe
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Apparence</CardTitle>
                  <CardDescription>Choisissez le thème de l'interface</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(Object.keys(themes) as ThemeName[]).map((key) => {
                      const t = themes[key];
                      const active = theme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTheme(key)}
                          className={`flex flex-col items-start gap-1 p-4 rounded-lg border text-left transition-colors ${
                            active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                          }`}
                        >
                          <span className="text-2xl">{t.emoji}</span>
                          <span className="font-medium text-sm">{t.name}</span>
                          <span className="text-xs text-muted-foreground">{t.description}</span>
                          {active && (
                            <span className="text-xs text-primary font-semibold mt-1">✓ Actif</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </>
  );
}
