import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";
import Seo from "@/components/Seo";
import { Loader2 } from "lucide-react";

const setCodeSchema = z
  .object({
    id: z.string().min(1, "Identifiant requis"),
    code: z.string().min(8, "Le code doit contenir au moins 8 caractères"),
    confirm: z.string().min(8, "Confirmez votre code"),
  })
  .refine((data) => data.code === data.confirm, {
    path: ["confirm"],
    message: "Les codes ne correspondent pas",
  });

export default function SetCode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof setCodeSchema>>({
    resolver: zodResolver(setCodeSchema),
    defaultValues: { id: "", code: "", confirm: "" },
  });

  useEffect(() => {
    document.body.classList.remove("overflow-hidden");
  }, []);

  const onSubmit = async (values: z.infer<typeof setCodeSchema>) => {
    if (!user?.email) {
      toast({ title: "Non authentifié", description: "Veuillez vous reconnecter.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("set-user-code", {
        body: { id: values.id.trim(), email: user.email, code: values.code.trim() },
      });
      
      if (error) {
        throw new Error(error.message || 'Erreur lors de la mise à jour du code');
      }

      // Met à jour le mot de passe Supabase pour l'utilisateur courant
      const { error: updErr } = await supabase.auth.updateUser({ password: values.code.trim() });
      if (updErr) {
        throw updErr;
      }

      toast({ title: "Code enregistré", description: "Votre code a été défini avec succès." });

      // Rediriger vers le tableau de bord
      window.location.href = "/dashboard";
    } catch (err: any) {
      let errorMessage = "Une erreur est survenue.";
      
      if (err?.message?.includes('Timeout')) {
        errorMessage = "La requête a pris trop de temps. Veuillez réessayer.";
      } else if (err?.message?.includes('2xx') || err?.message?.includes('status')) {
        errorMessage = "Erreur de serveur. Vérifiez que vos données sont correctes dans le système.";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      toast({ title: "Erreur", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>Veuillez vous connecter d'abord.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <>
      <Seo
        title="Définir mon code | ApidIA"
        description="Créez votre code de connexion personnel."
        canonical={`${window.location.origin}/auth/set-code`}
      />
      <main className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Créer votre code</CardTitle>
            <CardDescription>
              Compte: <span className="font-medium">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identifiant</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="text" placeholder="Votre ID" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau code</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Au moins 8 caractères" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le code</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Répétez votre code" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Enregistrement..." : "Enregistrer mon code"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
