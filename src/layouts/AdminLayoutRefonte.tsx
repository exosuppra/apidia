import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import FloatingChat from "@/components/FloatingChat";
import FloatingOtoChat from "@/components/FloatingOtoChat";
import { Icon, ApidiaLogo, Avatar, Button, IconName } from "@/pages/refonte/primitives";
import { useAdminInterface } from "@/hooks/useAdminInterface";
import "@/pages/refonte/refonte-tokens.css";

/* ===============================================================
   AdminLayoutRefonte
   Shell admin en charte Pays de Manosque — réutilise le V1Shell
   de la Refonte mais avec navigation react-router réelle et
   l'authentification Supabase existante.
   =============================================================== */

interface AdminLayoutRefonteProps {
  children?: ReactNode;
}

interface NavItem {
  id: string;
  icon: IconName;
  label: string;
  to: string;
  matchPrefixes?: string[];
}

const NAV: NavItem[] = [
  { id: "home", icon: "grid", label: "Hub", to: "/admin/dashboard" },
  {
    id: "fiches",
    icon: "eye",
    label: "Fiches",
    to: "/admin/fiches",
    matchPrefixes: ["/admin/fiches", "/admin/verification-alerts", "/admin/fiches-verified", "/admin/import-fiches"],
  },
  { id: "stats", icon: "chart", label: "Statistiques", to: "/admin/stats-web", matchPrefixes: ["/admin/stats-web", "/admin/stats-ereputation"] },
  { id: "missions", icon: "briefcase", label: "Missions", to: "/admin/missions" },
];

export default function AdminLayoutRefonte({ children }: AdminLayoutRefonteProps) {
  const { user, isGoogleSheetsUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setInterface] = useAdminInterface();
  const [permissions, setPermissions] = useState<{ apidia: boolean; oto: boolean }>({ apidia: false, oto: false });
  const [profile, setProfile] = useState<{ name: string; email: string; initials: string; role: string }>({
    name: "Administrateur",
    email: "",
    initials: "AD",
    role: "Administrateur",
  });

  // Applique le thème PdM sur le document (garde la parité avec Lovable's AdminLayout)
  useEffect(() => {
    const root = document.documentElement;
    const previous = Array.from(root.classList).filter((c) => c.startsWith("theme-"));
    previous.forEach((c) => root.classList.remove(c));
    root.classList.add("theme-tourisme");
    return () => {
      root.classList.remove("theme-tourisme");
      previous.forEach((c) => root.classList.add(c));
    };
  }, []);

  // Permissions pour les floating chats
  useEffect(() => {
    const check = async () => {
      if (!user || isGoogleSheetsUser) {
        setPermissions({ apidia: false, oto: false });
        return;
      }
      const cloudUser = user as User;
      const { data } = await supabase
        .from("admin_permissions")
        .select("page_key")
        .eq("user_id", cloudUser.id)
        .in("page_key", ["apidia", "telegram-oto"]);

      const keys = (data || []).map((d: any) => d.page_key);
      setPermissions({
        apidia: keys.includes("apidia"),
        oto: keys.includes("telegram-oto"),
      });
    };
    check();
  }, [user, isGoogleSheetsUser]);

  // Profil utilisateur courant (nom, email, initiales)
  useEffect(() => {
    if (!user) return;
    const email = (user as any).email || "";
    const meta = (user as any).user_metadata || {};
    const fullName: string =
      meta.full_name ||
      meta.name ||
      (email ? email.split("@")[0].split(".").map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : "Administrateur");
    const initials = fullName
      .split(" ")
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    setProfile({
      name: fullName,
      email,
      initials: initials || "AD",
      role: "Administrateur",
    });
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    navigate("/admin/login");
  };

  const switchToClassic = () => {
    setInterface("classic");
  };

  const isActive = (item: NavItem) => {
    const prefixes = item.matchPrefixes || [item.to];
    return prefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
  };

  const pageTitle = resolvePageTitle(location.pathname);

  return (
    <div className="refonte-root" data-accent="jaune" data-density="comfy" data-motion="on">
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", background: "var(--gris-100)" }}>
        {/* Sidebar */}
        <aside
          style={{
            background: "var(--gris-900)",
            color: "white",
            padding: "22px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 0,
            height: "100vh",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
            <ApidiaLogo size={40} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1, letterSpacing: "-0.01em" }}>APIDIA</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Back-office PdM</div>
            </div>
          </div>

          <nav style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((n) => {
              const active = isActive(n);
              return (
                <NavLink
                  key={n.id}
                  to={n.to}
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    background: active ? "rgba(255,214,65,0.14)" : "transparent",
                    color: active ? "var(--pdm-jaune)" : "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: "all var(--dur-fast)",
                    position: "relative",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {active && (
                    <span style={{ position: "absolute", left: -16, top: 8, bottom: 8, width: 3, borderRadius: 2, background: "var(--pdm-jaune)" }} />
                  )}
                  <Icon name={n.icon} size={16} />
                  {n.label}
                </NavLink>
              );
            })}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Bouton switch interface */}
          <button
            onClick={switchToClassic}
            title="Revenir à l'interface classique"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              transition: "all var(--dur-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
            }}
          >
            <Icon name="refresh" size={13} />
            Interface classique
          </button>

          {/* Statut synchro */}
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Synchro APIDAE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--pdm-vert)", boxShadow: "0 0 8px var(--pdm-vert)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>En ligne</span>
            </div>
          </div>

          {/* Profil */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Avatar initials={profile.initials} size={32} color="vert" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.email || profile.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                color: "rgba(255,255,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "transparent",
                border: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
              }}
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <header
            style={{
              padding: "20px 32px 16px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              position: "sticky",
              top: 0,
              zIndex: 30,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.1 }}>
                {pageTitle.title}
              </h1>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{pageTitle.subtitle}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="ghost" size="sm" icon="refresh" onClick={switchToClassic}>
                Interface classique
              </Button>
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <Icon name="bell" size={15} />
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: "var(--pdm-jaune)",
                    border: "1.5px solid var(--surface)",
                  }}
                />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4, padding: "0 10px 0 4px", borderRadius: 20, background: "var(--surface-2)" }}>
                <Avatar initials={profile.initials} size={30} color="vert" />
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{profile.name}</div>
                  <div style={{ color: "var(--text-3)", fontSize: 10 }}>{profile.role}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </main>
      </div>

      {permissions.apidia && <FloatingChat />}
      {permissions.oto && <FloatingOtoChat />}
    </div>
  );
}

function resolvePageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/admin/dashboard") return { title: "Administration", subtitle: "Tableau de bord · accès à toutes les rubriques" };
  if (pathname.startsWith("/admin/fiches")) return { title: "Gestion des fiches", subtitle: "Données touristiques APIDAE & Apidia" };
  if (pathname === "/admin/users") return { title: "Gestion des utilisateurs", subtitle: "Comptes & permissions administrateurs" };
  if (pathname === "/admin/requests") return { title: "Demandes utilisateurs", subtitle: "Modifications de fiches en attente" };
  if (pathname === "/admin/logs") return { title: "Historique des actions", subtitle: "Journal des activités utilisateurs" };
  if (pathname === "/admin/rh") return { title: "Suivi RH – Projets IA", subtitle: "Heures de travail et valorisation des projets IA" };
  if (pathname === "/admin/missions") return { title: "Ordres de Mission", subtitle: "Suivi des déplacements et frais de l'équipe" };
  if (pathname === "/admin/stats-web") return { title: "Statistiques Web", subtitle: "Performances des sites du réseau" };
  if (pathname === "/admin/stats-ereputation") return { title: "E-réputation Google", subtitle: "Avis et notes par établissement" };
  if (pathname === "/admin/verification-alerts") return { title: "Alertes de vérification", subtitle: "Fiches nécessitant une revue" };
  if (pathname === "/admin/import-fiches") return { title: "Import de fiches", subtitle: "Import APIDAE → Apidia" };
  if (pathname === "/admin/fiches-verified") return { title: "Fiches vérifiées", subtitle: "Historique des validations" };
  if (pathname === "/admin/planning-santons") return { title: "Planning Foire aux Santons", subtitle: "Bénévoles & planning" };
  if (pathname === "/admin/linking") return { title: "Linking", subtitle: "Suivi du linking par commune" };
  if (pathname === "/admin/apidia") return { title: "ApidIA – Base de connaissances", subtitle: "Enrichissement du conseiller en séjour virtuel" };
  if (pathname === "/admin/telegram-oto") return { title: "OTO – Chat Telegram", subtitle: "Conversation bidirectionnelle avec les utilisateurs" };
  if (pathname === "/admin/widget-apidia") return { title: "Widget Apidia", subtitle: "Widgets d'intégration de fiches touristiques" };
  if (pathname === "/admin/planning") return { title: "Planning éditorial", subtitle: "Publications réseaux sociaux" };
  return { title: "Administration", subtitle: "Back-office Apidia" };
}
