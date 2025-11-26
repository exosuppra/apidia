import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { user, loading, isGoogleSheetsUser } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Les utilisateurs Google Sheets ne peuvent jamais être admin
      if (!user || isGoogleSheetsUser) {
        setIsAdmin(false);
        return;
      }

      // Type guard pour s'assurer que c'est un utilisateur Lovable Cloud
      const cloudUser = user as User;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', cloudUser.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!error && !!data);
    };

    checkAdminRole();
  }, [user, isGoogleSheetsUser]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
