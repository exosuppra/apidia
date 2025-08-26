import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import Seo from "@/components/Seo";
import { Loader2 } from "lucide-react";

const firstLoginSchema = z.object({
  id: z.string().min(1, "Identifiant requis"),
  email: z.string().email("Email invalide").min(1, "Email requis"),
});

const standardLoginSchema = z.object({
  id: z.string().min(1, "Identifiant requis"),
  email: z.string().email("Email invalide").min(1, "Email requis"),
  code: z.string().min(1, "Code requis"),
});

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("first");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstForm = useForm<z.infer<typeof firstLoginSchema>>({
    resolver: zodResolver(firstLoginSchema),
    defaultValues: { id: "", email: "" },
  });

  const standardForm = useForm<z.infer<typeof standardLoginSchema>>({
    resolver: zodResolver(standardLoginSchema),
    defaultValues: { id: "", email: "", code: "" },
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const onFirstSubmit = async (values: z.infer<typeof firstLoginSchema>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("request-login", {
        body: { id: values.id.trim(), email: values.email.trim() },
      });

      if (error) {
        throw new Error(error.message || "Erreur de connexion");
      }

      if (data.success) {
        toast({
          title: "Lien envoyé",
          description: "Vérifiez votre email pour vous connecter.",
        });
      }
    } catch (error: any) {
      console.error("First login error:", error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiant ou email incorrect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onStandardSubmit = async (values: z.infer<typeof standardLoginSchema>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("verify-login", {
        body: { id: values.id.trim(), email: values.email.trim(), code: values.code.trim() },
      });

      if (error) {
        throw new Error(error.message || "Erreur de connexion");
      }

      if (data.success) {
        // Connecter l'utilisateur avec l'email trouvé
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: values.code.trim(),
        });

        if (signInError) {
          throw signInError;
        }

        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });

        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Standard login error:", error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiant ou code incorrect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="Connexion ApidIA"
        description="Connectez-vous à ApidIA avec votre identifiant et code."
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
              Connectez-vous avec votre identifiant et code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="first">Première connexion</TabsTrigger>
                <TabsTrigger value="standard">Connexion standard</TabsTrigger>
              </TabsList>
              
              <TabsContent value="first">
                <Form {...firstForm}>
                  <form onSubmit={firstForm.handleSubmit(onFirstSubmit)} className="space-y-4">
                    <FormField
                      control={firstForm.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identifiant</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="Votre identifiant" 
                              {...field} 
                              value={field.value ?? ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={firstForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Votre email" 
                              {...field} 
                              value={field.value ?? ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loading ? "Envoi du lien..." : "Recevoir le lien de connexion"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="standard">
                <Form {...standardForm}>
                  <form onSubmit={standardForm.handleSubmit(onStandardSubmit)} className="space-y-4">
                    <FormField
                      control={standardForm.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identifiant</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="Votre identifiant" 
                              {...field} 
                              value={field.value ?? ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={standardForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Votre email" 
                              {...field} 
                              value={field.value ?? ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={standardForm.control}
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
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
