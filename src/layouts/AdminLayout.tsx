import { useState, useEffect } from "react";
import FloatingChat from "@/components/FloatingChat";
import FloatingOtoChat from "@/components/FloatingOtoChat";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useAdminInterface } from "@/hooks/useAdminInterface";
import { Sparkles } from "lucide-react";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isGoogleSheetsUser } = useAuth();
  const [, setAdminInterface] = useAdminInterface();
  const [permissions, setPermissions] = useState<{ apidia: boolean; oto: boolean }>({ apidia: false, oto: false });

  // Apply Pays de Manosque tourisme theme to entire admin area
  useEffect(() => {
    const root = document.documentElement;
    const previousThemes = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    previousThemes.forEach(c => root.classList.remove(c));
    root.classList.add('theme-tourisme');
    return () => {
      root.classList.remove('theme-tourisme');
      previousThemes.forEach(c => root.classList.add(c));
    };
  }, []);

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

      {/* Bouton flottant : passer à la nouvelle interface */}
      <button
        onClick={() => setAdminInterface("refonte")}
        title="Essayer la nouvelle interface (charte Pays de Manosque)"
        className="fixed z-40 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
        style={{
          bottom: 24,
          left: 24,
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Essayer la nouvelle interface
      </button>
    </>
  );
}
