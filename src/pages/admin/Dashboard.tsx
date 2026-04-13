import { useEffect, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Shield, LogOut, Users, FileText, Eye, Calendar, CalendarClock, Clock, Globe, BarChart3, History, Star, Briefcase, TreePine, GripVertical, ArrowUp, ArrowDown, Link2, Bot, Activity, RefreshCw, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { logUserAction } from "@/lib/logUserAction";
import { useAuth } from "@/context/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FloatingChat from "@/components/FloatingChat";
import ThemeSelector from "@/components/ThemeSelector";

type SectionKey = "rh-admin" | "donnees-touristiques" | "reseaux-sociaux" | "projet-web";

const DEFAULT_ORDER: SectionKey[] = ["rh-admin", "donnees-touristiques", "reseaux-sociaux", "projet-web"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntenseVerdonPopup, setShowIntenseVerdonPopup] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(DEFAULT_ORDER);
  const [isReordering, setIsReordering] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleIntenseVerdonClick = () => {
    const newTab = window.open("https://intense-verdon-edito.lovable.app", "_blank");
    setShowIntenseVerdonPopup(true);
    setTimeout(() => {
      setShowIntenseVerdonPopup(false);
    }, 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [permResult, orderResult, roleResult] = await Promise.all([
        supabase.from('admin_permissions').select('page_key').eq('user_id', user.id),
        supabase.from('admin_dashboard_order').select('section_order').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      ]);

      setPermissions(permResult.data?.map(p => p.page_key) || []);
      setIsAdmin(roleResult.data === true);

      if (orderResult.data?.section_order) {
        const saved = orderResult.data.section_order as SectionKey[];
        const merged = [...saved, ...DEFAULT_ORDER.filter(k => !saved.includes(k))];
        setSectionOrder(merged);
      }

      // Fetch activity logs
      const logsQuery = supabase
        .from('user_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: logs } = await logsQuery;
      setActivityLogs(logs || []);

      setLoading(false);

      // Log page view
      logUserAction("view_page", { page: "dashboard" });
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    logUserAction("logout");
    await supabase.auth.signOut();
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
    navigate("/admin/login");
  };

  const hasPermission = (pageKey: string) => permissions.includes(pageKey);

  const saveSectionOrder = useCallback(async (newOrder: SectionKey[]) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('admin_dashboard_order')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('admin_dashboard_order').update({ section_order: newOrder as unknown as any, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    } else {
      await supabase.from('admin_dashboard_order').insert({ user_id: user.id, section_order: newOrder as unknown as any });
    }
  }, [user]);

  const moveSection = (key: SectionKey, direction: "up" | "down") => {
    const idx = sectionOrder.indexOf(key);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sectionOrder.length - 1) return;

    const newOrder = [...sectionOrder];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setSectionOrder(newOrder);
    saveSectionOrder(newOrder);
  };

  const actionLabelsMap: Record<string, string> = {
    login: "s'est connecté(e)",
    logout: "s'est déconnecté(e)",
    view_page: "a consulté une page",
    create_task: "a créé une tâche",
    update_task: "a mis à jour une tâche",
    delete_task: "a supprimé une tâche",
    validate_task: "a validé une tâche",
    reject_task: "a rejeté une tâche",
    import_fiches: "a importé des fiches",
    export_data: "a exporté des données",
    verify_fiche: "a vérifié une fiche",
    edit_fiche: "a modifié une fiche",
    sync_apidae: "a lancé une synchronisation Apidae",
    sync_sheets: "a synchronisé vers Google Sheets",
    linking_check: "a vérifié un site Linking",
    linking_send_email: "a envoyé un email Linking",
    linking_import: "a importé des sites Linking",
    linking_add_site: "a ajouté un site Linking",
    linking_edit_site: "a modifié un site Linking",
    linking_delete_site: "a supprimé un site Linking",
    create_planning: "a créé un planning",
    update_planning: "a mis à jour un planning",
    apidia_knowledge_update: "a mis à jour la base Apidia",
    apidia_knowledge_add: "a ajouté une connaissance Apidia",
    apidia_knowledge_delete: "a supprimé une connaissance Apidia",
    import_excel: "a importé un fichier Excel",
    bulk_verification: "a lancé une vérification en masse",
    toggle_publish_fiche: "a modifié la publication d'une fiche",
    transfer_fiche: "a transféré une fiche",
    create_user: "a créé un utilisateur",
    delete_user: "a supprimé un utilisateur",
    update_permissions: "a modifié des permissions",
    reset_password: "a réinitialisé un mot de passe",
    telegram_poll: "a récupéré des messages Telegram",
    telegram_send: "a envoyé un message Telegram",
    other: "a effectué une action",
  };

  const actionLabel = (type: string) => actionLabelsMap[type] || type;

  const formatDetails = (details: any) => {
    if (!details) return "";
    if (typeof details === "string") return details;
    if (details.page) return `Page : ${details.page}`;
    if (details.task_title) return details.task_title;
    if (details.fiche_id) return `Fiche ${details.fiche_id}`;
    if (details.url) return details.url;
    return JSON.stringify(details).substring(0, 100);
  };

  const ActionIcon = ({ actionType }: { actionType: string }) => {
    const iconClass = "h-4 w-4";
    switch (actionType) {
      case "login":
      case "logout":
        return <Shield className={`${iconClass} text-primary`} />;
      case "create_task":
      case "update_task":
      case "validate_task":
      case "reject_task":
        return <Calendar className={`${iconClass} text-blue-500`} />;
      case "import_fiches":
      case "import_excel":
        return <FileText className={`${iconClass} text-green-500`} />;
      case "verify_fiche":
      case "edit_fiche":
        return <Eye className={`${iconClass} text-orange-500`} />;
      case "linking_check":
      case "linking_send_email":
        return <Link2 className={`${iconClass} text-purple-500`} />;
      case "sync_apidae":
      case "bulk_verification":
        return <RefreshCw className={`${iconClass} text-cyan-500`} />;
      default:
        return <Activity className={`${iconClass} text-muted-foreground`} />;
    }
  };

  // Section visibility checks
  const sectionVisible: Record<SectionKey, boolean> = {
    "rh-admin": hasPermission('users') || hasPermission('rh') || hasPermission('missions') || hasPermission('planning-santons'),
    "donnees-touristiques": hasPermission('requests') || hasPermission('fiches') || hasPermission('logs') || hasPermission('apidia') || hasPermission('telegram-oto'),
    "reseaux-sociaux": hasPermission('planning'),
    "projet-web": hasPermission('intense-verdon') || hasPermission('stats-web') || hasPermission('stats-ereputation') || hasPermission('linking'),
  };

  const sectionLabels: Record<SectionKey, string> = {
    "rh-admin": "RH & Administration",
    "donnees-touristiques": "Accueil & Qualification de la donnée touristique",
    "reseaux-sociaux": "Gestion de Projet Réseaux sociaux",
    "projet-web": "Gestion de Projet Web",
  };

  const renderSectionContent = (key: SectionKey): ReactNode => {
    switch (key) {
      case "rh-admin":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPermission('users') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gestion des utilisateurs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Gérer les comptes utilisateurs et leurs permissions</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/users")}>Accéder</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('rh') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Suivi RH - Projets IA</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Suivi des heures de travail et valorisation des projets IA</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/rh")}>Accéder au suivi RH</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('missions') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ordres de Mission</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Suivi des ordres de mission et frais associés</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/missions")}>Accéder aux missions</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('planning-santons') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planning Foire aux Santons</CardTitle>
                  <TreePine className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Gestion des bénévoles et planning de la Foire aux Santons</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/planning-santons")}>Accéder au planning</Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "donnees-touristiques":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPermission('requests') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Demandes utilisateurs</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Traiter les demandes de modification des fiches</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/requests")}>Voir les demandes</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('fiches') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toutes les fiches</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Données touristiques Apidae, mises à jour par l'agent IA ApidIA</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/fiches")}>Voir toutes les fiches</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('logs') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Historique des actions</CardTitle>
                  <History className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Voir l'historique des actions des utilisateurs</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/logs")}>Consulter l'historique</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('apidia') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Apidia : Base de connaissances</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Enrichissez les connaissances du conseiller en séjour virtuel</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/apidia")}>Gérer la base</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('telegram-oto') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">OTO : Chat Telegram</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Chat bidirectionnel avec les utilisateurs via Telegram</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/telegram-oto")}>Accéder au chat OTO</Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "reseaux-sociaux":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Planning éditorial social média</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>Gérer le planning de publication sur les réseaux sociaux</CardDescription>
                <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/planning")}>Accéder au planning</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "projet-web":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPermission('intense-verdon') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Intense Verdon Edito</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Plateforme éditoriale Intense Verdon</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={handleIntenseVerdonClick}>Accéder à la plateforme</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('stats-web') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Statistiques Web</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Statistiques et données des projets web</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/stats-web")}>Voir les statistiques</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('stats-ereputation') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">E-réputation Google</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Suivi des avis et notes Google par établissement</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/stats-ereputation")}>Voir les statistiques</Button>
                </CardContent>
              </Card>
            )}
            {hasPermission('linking') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Linking</CardTitle>
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Suivi du linking par commune et vérification des sites</CardDescription>
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/admin/linking")}>Accéder au linking</Button>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  // Filter to only visible sections in the user's order
  const visibleSections = sectionOrder.filter(key => sectionVisible[key]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Tableau de bord Administrateur"
        description="Interface d'administration"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Administration</h1>
                <p className="text-sm text-muted-foreground">
                  Connecté en tant que {user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={isReordering ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
                title="Personnaliser l'ordre des sections"
              >
                <GripVertical className="w-4 h-4 mr-1" />
                {isReordering ? "Terminé" : "Réorganiser"}
              </Button>
              <ThemeSelector />
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>

          {/* Dynamic sections */}
          {visibleSections.map((key, idx) => (
            <section key={key} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                {isReordering && (
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0}
                      onClick={() => moveSection(key, "up")}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === visibleSections.length - 1}
                      onClick={() => moveSection(key, "down")}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <h2 className="text-lg font-semibold text-primary">{sectionLabels[key]}</h2>
              </div>
              {renderSectionContent(key)}
            </section>
          ))}

          {/* Dialog Intense Verdon */}
          <Dialog open={showIntenseVerdonPopup} onOpenChange={setShowIntenseVerdonPopup}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Identifiants Intense Verdon</DialogTitle>
              </DialogHeader>
              <div className="text-center py-6 text-lg font-medium">
                mail pro + Mauque04
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Redirection automatique dans 5 secondes...
              </p>
            </DialogContent>
          </Dialog>

          {/* Recent Activity */}
          {hasPermission('logs') && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Activité récente
                </CardTitle>
                <CardDescription>
                  {isAdmin ? "Toutes les actions de l'équipe" : "Vos dernières actions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune activité récente à afficher</div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0">
                        <div className="mt-0.5">
                          <ActionIcon actionType={log.action_type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isAdmin && (
                              <span className="font-medium text-foreground">{log.user_email}</span>
                            )}
                            <span className="text-muted-foreground">{actionLabel(log.action_type)}</span>
                          </div>
                          {log.action_details && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {formatDetails(log.action_details)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* OTO Arena - Agents IA en direct */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                OTO Arena — Agents IA en direct
              </CardTitle>
              <CardDescription>Visualisez l'activité des agents IA en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                src="https://oto-arena.lovable.app/embed?focus=b5b567c6-f866-45a1-8b7a-7f1a267a1f64"
                className="w-full border-0 rounded-b-lg"
                style={{ height: "500px", borderRadius: "8px" }}
                allow="autoplay"
                title="OTO Arena - Claude Pixel Live"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <FloatingChat />
    </>
  );
}
