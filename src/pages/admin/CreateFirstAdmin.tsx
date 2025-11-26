import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function CreateFirstAdmin() {
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const createAdmin = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          email: "q.duroy@paysdemanosque.com",
          password: "Mauque04",
          secret: "create-admin-2024"
        }
      });

      if (error) throw error;

      if (data.success) {
        setCreated(true);
        toast({
          title: "Administrateur créé",
          description: `Compte admin créé pour ${data.admin.email}`,
        });
      } else {
        throw new Error(data.error || "Erreur lors de la création");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'administrateur",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Création Compte Admin</CardTitle>
          <CardDescription>
            {created 
              ? "Compte administrateur créé avec succès" 
              : "Cliquez pour créer le compte administrateur"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {created ? (
            <>
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p><strong>Email:</strong> q.duroy@paysdemanosque.com</p>
                <p className="text-green-600">✓ Compte créé avec succès</p>
              </div>
              <Button 
                onClick={() => navigate("/admin/login")}
                className="w-full"
              >
                Aller à la connexion
              </Button>
            </>
          ) : (
            <Button 
              onClick={createAdmin}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer le compte administrateur"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
