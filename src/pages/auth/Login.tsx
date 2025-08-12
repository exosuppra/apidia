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
});

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof idLoginSchema>>({
    resolver: zodResolver(idLoginSchema),
    defaultValues: { id: "", email: "" },
  });

  const onSubmit = async (values: z.infer<typeof idLoginSchema>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("request-login", {
        body: {
          id: values.id.trim(),
          email: values.email.trim(),
          redirectUrl: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      toast({ title: "Vérifiez votre email", description: "Nous avons envoyé un lien de connexion." });
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
                <Button className="w-full" type="submit" disabled={loading}>Recevoir le lien de connexion</Button>
              </form>
            </Form>
            <p className="mt-4 text-sm text-muted-foreground">
              Si vos informations correspondent à notre registre, vous recevrez un lien magique par email.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
