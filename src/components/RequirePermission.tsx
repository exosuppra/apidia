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

      // On charge en parallèle les permissions granulaires + le rôle admin
      const [{ data: perms }, { data: isAdminData }] = await Promise.all([
        supabase
          .from('admin_permissions')
          .select('page_key')
          .eq('user_id', cloudUser.id),
        supabase.rpc('has_role', { _user_id: cloudUser.id, _role: 'admin' }),
      ]);

      const permsList = (perms || []).map((p: any) => p.page_key);
      const hasGranular = permsList.length > 0;
      const isAdmin = isAdminData === true;

      // Règle : si l'utilisateur a des permissions granulaires définies, elles priment
      // sur le rôle admin (configuration de droits restreints). Sinon le rôle admin
      // donne accès à tout.
      if (hasGranular) {
        setHasPermission(permsList.includes(pageKey));
      } else {
        setHasPermission(isAdmin);
      }
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
