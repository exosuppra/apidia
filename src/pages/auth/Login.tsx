import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import Seo from "@/components/Seo";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  id: z.string().min(1, "Identifiant requis"),
  code: z.string().min(1, "Code requis"),
});

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { id: "", code: "" },
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("verify-login", {
        body: { id: values.id.trim(), code: values.code.trim() },
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
      console.error("Login error:", error);
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
