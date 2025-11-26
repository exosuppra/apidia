import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGoogleSheetsUser } = useAuth();

  const handleSignOut = async () => {
    if (isGoogleSheetsUser) {
      // Déconnexion pour utilisateur Google Sheets
      localStorage.removeItem('google_sheets_session');
      toast({ title: "Déconnecté", description: "À bientôt." });
      navigate("/auth/login", { replace: true });
    } else {
      // Déconnexion pour utilisateur Lovable Cloud
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ title: "Erreur de déconnexion", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Déconnecté", description: "À bientôt." });
        navigate("/auth/login", { replace: true });
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="h-14 flex items-center border-b px-4">
            <SidebarTrigger className="mr-2" />
            <div className="font-semibold">Apidia • Dashboard</div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Déconnexion
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

