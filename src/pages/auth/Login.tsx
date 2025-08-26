import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const idLoginSchema = z.object({
  id: z.string().min(1, "Identifiant requis"),
  email: z.string().email("Email invalide"),
  code: z.string().min(4, "Code trop court").optional(),
});

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"first" | "standard">("first");

  const form = useForm<z.infer<typeof idLoginSchema>>({
    resolver: zodResolver(idLoginSchema),
defaultValues: { id: "", email: "", code: "" },
  });

const onSubmit = async (values: z.infer<typeof idLoginSchema>) => {
  try {
    setLoading(true);
    console.log('Submitting form with mode:', mode, 'values:', values);

    const id = values.id.trim();
    const email = values.email.trim();
    const code = values.code?.trim();

    // Nettoyage d'état auth avant nouvelle tentative
    try {
      // Remove supabase auth keys from storage as per best practices
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
          sessionStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut({ scope: "global" } as any);
    } catch {}

    if (code) {
      // Connexion directe: vérifier l'ID/email/code dans le Google Sheet
      const { data, error } = await supabase.functions.invoke("verify-login", {
        body: { id, email, code },
      });
      if (error) throw error;

      // Si OK, on connecte avec Supabase (email + code)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: code });
      if (signInErr) throw signInErr;

      window.location.href = "/dashboard";
      return;
    }

    // Première connexion: envoi d'un lien magique vers la page de création du code
    console.log('Calling request-login function with:', { id, email });
    
    // Timeout après 25 secondes pour éviter l'erreur à 30s
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: La requête a pris trop de temps')), 25000)
    );
    
    const requestPromise = supabase.functions.invoke("request-login", {
      body: {
        id,
        email,
        redirectUrl: `${window.location.origin}/auth/set-code`,
      },
    });
    
    const result = await Promise.race([requestPromise, timeoutPromise]);
    console.log('Request-login response:', result);
    if (result.error) throw result.error;
    toast({ title: "Vérifiez votre email", description: "Un lien vous a été envoyé pour créer votre code." });
  } catch (err: any) {
    console.error('Login error:', err);
    
    // Message d'erreur user-friendly pour tous les cas d'échec d'authentification
    let userMessage = "Une erreur est survenue.";
    
    if (mode === "standard") {
      // Pour la connexion standard, toujours dire que les identifiants sont incorrects
      userMessage = "Identifiant, email ou code incorrect.";
    } else {
      // Pour la première connexion, message selon le type d'erreur
      if (err?.message?.includes("non trouvés") || err?.message?.includes("non autorisés") || err?.message?.includes("Identifiants invalides")) {
        userMessage = "Identifiant ou email incorrect.";
      } else if (err?.message?.includes("Timeout")) {
        userMessage = "La requête a pris trop de temps. Veuillez réessayer.";
      } else {
        userMessage = "Erreur lors de l'envoi du lien. Veuillez réessayer.";
      }
    }
    
    toast({ 
      title: "Connexion refusée", 
      description: userMessage, 
      variant: "destructive" 
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    document.body.classList.remove("overflow-hidden");
  }, []);

  useEffect(() => {
    if (mode === "first") {
      form.setValue("code", "");
    }
  }, [mode, form]);
  return (
    <>
      <Seo
        title="Connexion ApidIA | ID + Email"
        description="Connectez-vous à ApidIA avec votre identifiant et votre adresse email."
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
            <CardTitle>ApidIA – Connexion</CardTitle>
            <CardDescription>Saisissez votre ID et votre email</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "first" | "standard")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="first">Première connexion</TabsTrigger>
                <TabsTrigger value="standard">Connexion standard</TabsTrigger>
              </TabsList>
            </Tabs>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identifiant</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          inputMode="text" 
                          placeholder="Votre ID" 
                          {...field} 
                          value={field.value ?? ""} 
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          inputMode="email" 
                          placeholder="vous@exemple.com" 
                          {...field} 
                          value={field.value ?? ""} 
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === "standard" && (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Votre code" 
                            {...field} 
                            value={field.value ?? ""} 
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Button 
                  className="w-full" 
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    console.log('Button clicked directly');
                    const values = form.getValues();
                    console.log('Form values:', values);
                    
                    if (!values.id || !values.email) {
                      toast({ 
                        title: "Erreur", 
                        description: "Veuillez remplir l'ID et l'email", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    await onSubmit(values);
                  }}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Chargement..." : (mode === "first" ? "Recevoir le lien de connexion" : "Se connecter")}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-sm text-muted-foreground">
              Utilisez les onglets: « Première connexion » pour recevoir le lien par email, puis « Connexion standard » avec ID + email + code.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
