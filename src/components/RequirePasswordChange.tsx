import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function RequirePasswordChange({ children }: { children: ReactNode }) {
  const { user, loading, isGoogleSheetsUser } = useAuth();
  const location = useLocation();
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Les utilisateurs Google Sheets n'ont pas besoin de changer de mot de passe
      if (isGoogleSheetsUser) {
        setMustChangePassword(false);
        setChecking(false);
        return;
      }

      // Type guard pour s'assurer que c'est un utilisateur Lovable Cloud
      const cloudUser = user as User;

      const { data, error } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', cloudUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking password change requirement:", error);
        setMustChangePassword(false);
      } else {
        setMustChangePassword(data?.must_change_password ?? false);
      }
      
      setChecking(false);
    };

    checkPasswordChangeRequired();
  }, [user, isGoogleSheetsUser]);

  if (loading || checking) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  // Skip password change check for the change password page itself
  if (location.pathname === "/auth/change-password") {
    return <>{children}</>;
  }

  if (mustChangePassword) {
    return <Navigate to="/auth/change-password" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
