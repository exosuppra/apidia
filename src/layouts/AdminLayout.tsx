import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/AdminSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { Shield } from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSignOut = async () => {
    // Nettoyer la session admin
    localStorage.removeItem("admin_session");
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Erreur de déconnexion", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Déconnecté", description: "Session administrateur fermée." });
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset>
          <header className="h-14 flex items-center border-b px-4 bg-destructive/5">
            <SidebarTrigger className="mr-2" />
            <Shield className="mr-2 h-5 w-5 text-destructive" />
            <div className="font-semibold">
              Apidia • Administration
              <span className="ml-2 text-sm text-muted-foreground">
                ({user?.email})
              </span>
            </div>
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