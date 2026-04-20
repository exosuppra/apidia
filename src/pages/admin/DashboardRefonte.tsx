import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Icon, Chip, IconName } from "@/pages/refonte/primitives";
import { format } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import Seo from "@/components/Seo";

/* ===============================================================
   DashboardRefonte · Hub admin en charte Pays de Manosque
   S'inspire du V1Home de la Refonte mais connecte sur les vraies
   données Supabase (permissions, logs d'activité) et navigue vers
   les vraies routes /admin/*.
   =============================================================== */

interface HubItem {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
  cta: string;
  to: string;
  permKey?: string; // clé admin_permissions.page_key requise
  external?: () => void;
}

interface HubGroup {
  group: string;
  icon: IconName;
  items: HubItem[];
}

const HUB_GROUPS: HubGroup[] = [
  {
    group: "RH & Administration",
    icon: "users",
    items: [
      { id: "users", icon: "users", title: "Gestion des utilisateurs", desc: "Gérer les comptes utilisateurs et leurs permissions", cta: "Accéder", to: "/admin/users", permKey: "users" },
      { id: "rh", icon: "clock", title: "Suivi RH – Projets IA", desc: "Suivi des heures de travail et valorisation des projets IA", cta: "Accéder au suivi RH", to: "/admin/rh", permKey: "rh" },
      { id: "missions", icon: "briefcase", title: "Ordres de Mission", desc: "Suivi des ordres de mission et frais associés", cta: "Accéder aux missions", to: "/admin/missions", permKey: "missions" },
      { id: "santons", icon: "bell", title: "Planning Foire aux Santons", desc: "Gestion des bénévoles et planning de la Foire aux Santons", cta: "Accéder au planning", to: "/admin/planning-santons", permKey: "planning-santons" },
    ],
  },
  {
    group: "Accueil & Qualification de la donnée touristique",
    icon: "pin",
    items: [
      { id: "requests", icon: "inbox", title: "Demandes utilisateurs", desc: "Traiter les demandes de modification des fiches", cta: "Voir les demandes", to: "/admin/requests", permKey: "requests" },
      { id: "fiches", icon: "eye", title: "Toutes les fiches", desc: "Données touristiques Apidae, mises à jour par l'agent IA ApidIA", cta: "Voir toutes les fiches", to: "/admin/fiches", permKey: "fiches" },
      { id: "logs", icon: "history", title: "Historique des actions", desc: "Voir l'historique des actions des utilisateurs", cta: "Consulter l'historique", to: "/admin/logs", permKey: "logs" },
      { id: "apidia", icon: "book", title: "ApidIA : Base de connaissances", desc: "Enrichissez les connaissances du conseiller en séjour virtuel", cta: "Gérer la base", to: "/admin/apidia", permKey: "apidia" },
      { id: "oto", icon: "chat", title: "OTO : Chat Telegram", desc: "Chat bidirectionnel avec les utilisateurs via Telegram", cta: "Accéder au chat OTO", to: "/admin/telegram-oto", permKey: "telegram-oto" },
    ],
  },
  {
    group: "Gestion de Projet Réseaux sociaux",
    icon: "share",
    items: [
      { id: "planning", icon: "calendar", title: "Planning éditorial social média", desc: "Gérer le planning de publication sur les réseaux sociaux", cta: "Accéder au planning", to: "/admin/planning", permKey: "planning" },
    ],
  },
  {
    group: "Gestion de Projet Web",
    icon: "globe",
    items: [
      {
        id: "verdon",
        icon: "globe",
        title: "Intense Verdon Edito",
        desc: "Plateforme éditoriale Intense Verdon",
        cta: "Accéder à la plateforme",
        to: "",
        external: () => window.open("https://intense-verdon-edito.lovable.app", "_blank"),
      },
      { id: "stats-web", icon: "chart", title: "Statistiques Web", desc: "Statistiques et données des projets web", cta: "Voir les statistiques", to: "/admin/stats-web", permKey: "stats-web" },
      { id: "stats-ereputation", icon: "star", title: "E-réputation Google", desc: "Suivi des avis et notes Google par établissement", cta: "Voir les statistiques", to: "/admin/stats-ereputation", permKey: "stats-ereputation" },
      { id: "linking", icon: "link", title: "Linking", desc: "Suivi du linking par commune et vérification des sites", cta: "Accéder au linking", to: "/admin/linking", permKey: "linking" },
      { id: "widget", icon: "layers", title: "Widget Apidia", desc: "Créer des widgets d'intégration de fiches touristiques", cta: "Gérer les widgets", to: "/admin/widget-apidia", permKey: "widget-apidia" },
    ],
  },
];

interface ActivityRow {
  id: string;
  created_at: string;
  user_email: string | null;
  action_type: string;
  action_details: any;
}

export default function DashboardRefonte() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [permResult, roleResult, logsResult] = await Promise.all([
          supabase.from("admin_permissions").select("page_key").eq("user_id", (user as any).id),
          supabase.rpc("has_role", { _user_id: (user as any).id, _role: "admin" }),
          supabase.from("user_action_logs").select("*").order("created_at", { ascending: false }).limit(8),
        ]);
        setPermissions((permResult.data || []).map((p: any) => p.page_key));
        setIsAdmin(roleResult.data === true);
        setActivity((logsResult.data as any as ActivityRow[]) || []);
      } catch (e) {
        // fail silent — Hub reste utilisable même si certaines requêtes échouent
        console.warn("DashboardRefonte load error", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const canAccess = (item: HubItem) => {
    if (item.external) return true;
    if (!item.permKey) return true;
    if (isAdmin) return true;
    return permissions.includes(item.permKey);
  };

  const firstName = (() => {
    const email = (user as any)?.email || "";
    const meta = (user as any)?.user_metadata || {};
    const fullName: string = meta.full_name || meta.name || "";
    if (fullName) return fullName.split(" ")[0];
    if (email) {
      const part = email.split("@")[0].split(".")[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return "";
  })();

  const goTo = (item: HubItem) => {
    if (item.external) return item.external();
    if (item.to) navigate(item.to);
  };

  return (
    <>
      <Seo title="Administration · Apidia" description="Hub administrateur Apidia" />

      <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)" }}>
        {/* Hero éditorial */}
        <div style={{ padding: "28px 44px 24px", background: "var(--surface)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pdm-vert)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            ★ Tableau de bord administrateur
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.05, maxWidth: 900 }}>
            {firstName ? `Bonjour ${firstName}. ` : "Bienvenue. "}
            <span style={{ color: "var(--text-3)" }}>Voici votre</span>
            <br />
            espace de pilotage <span style={{ color: "var(--pdm-vert)" }}>Apidia</span>.
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12, maxWidth: 680 }}>
            Accédez à toutes les rubriques ci-dessous. Les modules grisés nécessitent une permission spécifique — contactez un administrateur pour y accéder.
          </div>
        </div>

        {/* Rubriques */}
        <div style={{ padding: "36px 44px 24px", maxWidth: 1400, margin: "0 auto" }}>
          {HUB_GROUPS.map((section, si) => {
            const visible = section.items.filter((it) => canAccess(it) || isAdmin);
            if (visible.length === 0 && !isAdmin) return null;
            const items = isAdmin ? section.items : visible;
            return (
              <section key={section.group} style={{ marginBottom: 42, animation: `refonte-fade-in 500ms ${si * 80}ms var(--ease-out) both` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "var(--gris-800)",
                      color: "var(--pdm-vert)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={section.icon} size={15} />
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, letterSpacing: "-0.015em", margin: 0, color: "var(--pdm-vert)" }}>{section.group}</h2>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{items.length} modules</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {items.map((item, i) => (
                    <HubCard key={item.id} item={item} delay={si * 80 + i * 40} canAccess={canAccess(item)} onClick={() => goTo(item)} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Activité récente */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gris-800)", color: "var(--pdm-vert)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="history" size={15} />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, letterSpacing: "-0.015em", margin: 0, color: "var(--pdm-vert)" }}>Activité récente</h2>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <button onClick={() => navigate("/admin/logs")} style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, cursor: "pointer", background: "transparent", border: "none" }}>
                Tout afficher →
              </button>
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
              {loading && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Chargement…</div>
              )}
              {!loading && activity.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Aucune activité récente</div>
              )}
              {!loading &&
                activity.slice(0, 6).map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderBottom: i < Math.min(activity.length, 6) - 1 ? "1px solid var(--border)" : "none",
                      animation: `refonte-slide-in-right 400ms ${i * 50}ms var(--ease-out) both`,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--pdm-vert)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                      <b>{(a.user_email || "Système").split("@")[0]}</b>
                      <span style={{ color: "var(--text-3)" }}> {formatAction(a.action_type)}</span>
                      {a.action_details && typeof a.action_details === "object" && (a.action_details as any).target && (
                        <b style={{ color: "var(--pdm-vert)" }}> {(a.action_details as any).target}</b>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {formatDate(a.created_at)}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

interface HubCardProps {
  item: HubItem;
  delay: number;
  canAccess: boolean;
  onClick: () => void;
}

function HubCard({ item, delay, canAccess, onClick }: HubCardProps) {
  const [hover, setHover] = useState(false);
  const disabled = !canAccess;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => !disabled && setHover(false)}
      disabled={disabled}
      style={{
        background: "var(--surface)",
        border: "1px solid " + (hover ? "var(--pdm-vert)" : "var(--border)"),
        borderRadius: 14,
        padding: 20,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all var(--dur-med) var(--ease-out)",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? "var(--sh-md)" : "var(--sh-xs)",
        animation: `refonte-fade-in 500ms ${delay}ms var(--ease-out) both`,
        position: "relative",
        overflow: "hidden",
        opacity: disabled ? 0.55 : 1,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: hover ? "var(--pdm-vert)" : "var(--vert-100)",
            color: hover ? "white" : "var(--vert-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all var(--dur-med) var(--ease-spring)",
            transform: hover ? "scale(1.08) rotate(-4deg)" : "none",
          }}
        >
          <Icon name={item.icon} size={20} />
        </div>
        {disabled && <Chip color="neutral" size="sm">Verrouillé</Chip>}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 5 }}>{item.title}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.45, marginBottom: 12, minHeight: 34 }}>{item.desc}</div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: hover ? "var(--pdm-vert)" : "var(--text-2)",
          transition: "color var(--dur-fast)",
        }}
      >
        {item.cta}
        <Icon name="chevron" size={13} style={{ transform: hover ? "translateX(3px)" : "none", transition: "transform var(--dur-fast)" }} />
      </div>
    </button>
  );
}

function formatAction(raw: string | undefined | null): string {
  if (typeof raw !== "string" || !raw) return "a effectué une action";
  const map: Record<string, string> = {
    login: "s'est connecté(e)",
    logout: "s'est déconnecté(e)",
    view_page: "a consulté une page",
    edit_fiche: "a modifié une fiche",
    create_fiche: "a créé une fiche",
    delete_fiche: "a supprimé une fiche",
    sync_apidae: "a synchronisé avec APIDAE",
  };
  return map[raw] || raw.split("_").join(" ");
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM HH:mm", { locale: frLocale });
  } catch {
    return iso;
  }
}
