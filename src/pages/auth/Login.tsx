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
import Seo from "@/components/Seo";

const idLoginSchema = z.object({
  id: z.string().min(1, "Identifiant requis"),
  email: z.string().email("Email invalide"),
  code: z.string().min(4, "Code trop court").optional(),
});

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof idLoginSchema>>({
    resolver: zodResolver(idLoginSchema),
defaultValues: { id: "", email: "", code: "" },
  });

const onSubmit = async (values: z.infer<typeof idLoginSchema>) => {
  try {
    setLoading(true);

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
    const { error } = await supabase.functions.invoke("request-login", {
      body: {
        id,
        email,
        redirectUrl: `${window.location.origin}/auth/set-code`,
      },
    });
    if (error) throw error;
    toast({ title: "Vérifiez votre email", description: "Un lien vous a été envoyé pour créer votre code." });
  } catch (err: any) {
    toast({ title: "Connexion refusée", description: err?.message || "Une erreur est survenue.", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    document.body.classList.remove("overflow-hidden");
  }, []);

  return (
    <>
      <Seo
        title="Connexion ApidIA | ID + Email"
        description="Connectez-vous à ApidIA avec votre identifiant et votre adresse email."
        canonical={`${window.location.origin}/auth/login`}
      />
      <main className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ApidIA – Connexion</CardTitle>
            <CardDescription>Saisissez votre ID et votre email</CardDescription>
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
                        <Input type="text" inputMode="text" placeholder="Votre ID" {...field} />
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
                        <Input type="email" inputMode="email" placeholder="vous@exemple.com" {...field} />
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
                      <FormLabel>Code (si déjà défini)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Votre code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={loading}>Recevoir le lien de connexion</Button>
              </form>
            </Form>
<p className="mt-4 text-sm text-muted-foreground">
               Première connexion: laissez le champ « Code » vide et vérifiez votre email pour créer votre code. Ensuite, utilisez ID + email + code.
             </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
