import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import Seo from "@/components/Seo";

const emailSchema = z.object({
  email: z.string().email("Email invalide"),
});

const signinSchema = emailSchema.extend({
  pin: z
    .string()
    .min(6, "PIN à 6 chiffres")
    .max(6, "PIN à 6 chiffres")
    .regex(/^\d{6}$/g, "Uniquement 6 chiffres"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<{ signin?: boolean; magic?: boolean; signup?: boolean }>({});
  const redirectTo = useMemo(() => (location.state as any)?.from?.pathname || "/dashboard", [location.state]);

  const signinForm = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", pin: "" },
  });

  const magicForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const signupForm = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", pin: "" },
  });

  const handleSignin = async (values: z.infer<typeof signinSchema>) => {
    setLoading((s) => ({ ...s, signin: true }));
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.pin,
    });
    setLoading((s) => ({ ...s, signin: false }));

    if (error) {
      toast({ title: "Connexion échouée", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bienvenue !", description: "Connexion réussie." });
      navigate(redirectTo, { replace: true });
    }
  };

  const handleMagic = async (values: z.infer<typeof emailSchema>) => {
    setLoading((s) => ({ ...s, magic: true }));
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading((s) => ({ ...s, magic: false }));

    if (error) {
      toast({ title: "Envoi du lien échoué", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vérifiez votre email", description: "Lien magique envoyé." });
    }
  };

  const handleSignup = async (values: z.infer<typeof signinSchema>) => {
    setLoading((s) => ({ ...s, signup: true }));
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.pin,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading((s) => ({ ...s, signup: false }));

    if (error) {
      toast({ title: "Inscription échouée", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Confirmez votre email", description: "Nous avons envoyé un lien de confirmation." });
    }
  };

  useEffect(() => {
    document.body.classList.remove("overflow-hidden");
  }, []);

  return (
    <>
      <Seo
        title="Connexion ApidIA | Authentification"
        description="Connectez-vous à ApidIA via PIN, lien magique ou créez votre compte."
        canonical={`${window.location.origin}/auth/login`}
      />
      <main className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ApidIA – Authentification</CardTitle>
            <CardDescription>Choisissez votre méthode de connexion</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="magic">Lien magique</TabsTrigger>
                <TabsTrigger value="signup">Première connexion</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <Form {...signinForm}>
                  <form onSubmit={signinForm.handleSubmit(handleSignin)} className="space-y-4">
                    <FormField
                      control={signinForm.control}
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
                      control={signinForm.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN (6 chiffres)</FormLabel>
                          <FormControl>
                            <Input type="password" inputMode="numeric" placeholder="••••••" maxLength={6} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button className="w-full" type="submit" disabled={loading.signin}>Se connecter</Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="magic" className="mt-4">
                <Form {...magicForm}>
                  <form onSubmit={magicForm.handleSubmit(handleMagic)} className="space-y-4">
                    <FormField
                      control={magicForm.control}
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
                    <Button className="w-full" type="submit" disabled={loading.magic}>Envoyer le lien</Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
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
                      control={signupForm.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN (6 chiffres)</FormLabel>
                          <FormControl>
                            <Input type="password" inputMode="numeric" placeholder="••••••" maxLength={6} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button className="w-full" type="submit" disabled={loading.signup}>Créer mon compte</Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
