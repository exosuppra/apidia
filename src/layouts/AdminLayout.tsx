import { useState, useEffect } from "react";
import FloatingChat from "@/components/FloatingChat";
import FloatingOtoChat from "@/components/FloatingOtoChat";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isGoogleSheetsUser } = useAuth();
  const [permissions, setPermissions] = useState<{ apidia: boolean; oto: boolean }>({ apidia: false, oto: false });

  useEffect(() => {
    const check = async () => {
      if (!user || isGoogleSheetsUser) {
        setPermissions({ apidia: false, oto: false });
        return;
      }
      const cloudUser = user as User;
      const { data } = await supabase
        .from('admin_permissions')
        .select('page_key')
        .eq('user_id', cloudUser.id)
        .in('page_key', ['apidia', 'telegram-oto']);

      const keys = (data || []).map(d => d.page_key);
      setPermissions({
        apidia: keys.includes('apidia'),
        oto: keys.includes('telegram-oto'),
      });
    };
    check();
  }, [user, isGoogleSheetsUser]);

  return (
    <>
      {children}
      {permissions.apidia && <FloatingChat />}
      {permissions.oto && <FloatingOtoChat />}
    </>
  );
}
