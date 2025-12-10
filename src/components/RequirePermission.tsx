import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface RequirePermissionProps {
  children: ReactNode;
  pageKey: string;
}

export default function RequirePermission({ children, pageKey }: RequirePermissionProps) {
  const { user, loading, isGoogleSheetsUser } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      // Les utilisateurs Google Sheets ne peuvent jamais accéder aux pages admin
      if (!user || isGoogleSheetsUser) {
        setHasPermission(false);
        return;
      }

      const cloudUser = user as User;
      
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('id')
        .eq('user_id', cloudUser.id)
        .eq('page_key', pageKey)
        .single();

      setHasPermission(!error && !!data);
    };

    checkPermission();
  }, [user, isGoogleSheetsUser, pageKey]);

  if (loading || hasPermission === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!hasPermission) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
