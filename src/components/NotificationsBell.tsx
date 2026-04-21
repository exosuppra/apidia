import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, FileEdit, ClipboardCheck, AlertTriangle, ListChecks, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type NotifKind = "task" | "validation" | "request" | "alert";

interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  subtitle?: string;
  createdAt: string;
  href: string;
}

const READ_KEY = (uid: string) => `notif_read_${uid}`;

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id || "anon";
      if (cancelled) return;
      setUserId(uid);
      try {
        const raw = localStorage.getItem(READ_KEY(uid));
        if (raw) setReadIds(new Set(JSON.parse(raw)));
      } catch {}
      await loadAll(uid);
    })();
    const t = setInterval(() => {
      if (userId) loadAll(userId);
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    const collected: NotifItem[] = [];

    // 1) Tâches assignées (todo / in_progress)
    try {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, created_at, assigned_to")
        .eq("assigned_to", uid)
        .in("status", ["todo", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(20);
      (data || []).forEach((t: any) => {
        collected.push({
          id: `task-${t.id}`,
          kind: "task",
          title: t.title,
          subtitle: t.due_date ? `Échéance le ${new Date(t.due_date).toLocaleDateString("fr-FR")}` : "Tâche en cours",
          createdAt: t.created_at,
          href: "/admin/planning-editorial",
        });
      });
    } catch {}

    // 2) Validations en attente
    try {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, validation_requested_at, validation_status")
        .eq("validation_status", "pending")
        .order("validation_requested_at", { ascending: false })
        .limit(20);
      (data || []).forEach((t: any) => {
        collected.push({
          id: `val-${t.id}`,
          kind: "validation",
          title: `Validation : ${t.title}`,
          subtitle: "En attente de réponse",
          createdAt: t.validation_requested_at || new Date().toISOString(),
          href: "/admin/planning-editorial",
        });
      });
    } catch {}

    // 3) Demandes utilisateurs en attente
    try {
      const { data } = await supabase
        .from("user_requests")
        .select("id, fiche_id, user_email, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      (data || []).forEach((r: any) => {
        collected.push({
          id: `req-${r.id}`,
          kind: "request",
          title: `Demande de ${r.user_email}`,
          subtitle: `Fiche ${r.fiche_id}`,
          createdAt: r.created_at,
          href: "/admin/requests",
        });
      });
    } catch {}

    // 4) Alertes de vérification
    try {
      const { data } = await supabase
        .from("verification_alerts")
        .select("id, fiche_name, field_name, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      (data || []).forEach((a: any) => {
        collected.push({
          id: `alert-${a.id}`,
          kind: "alert",
          title: `Alerte : ${a.fiche_name || "Fiche"}`,
          subtitle: `Champ ${a.field_name} à vérifier`,
          createdAt: a.created_at,
          href: "/admin/verification-alerts",
        });
      });
    } catch {}

    collected.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    setItems(collected);
  };

  const unreadCount = useMemo(
    () => items.filter((i) => !readIds.has(i.id)).length,
    [items, readIds]
  );

  const markAllRead = () => {
    const all = new Set(items.map((i) => i.id));
    setReadIds(all);
    try {
      localStorage.setItem(READ_KEY(userId), JSON.stringify(Array.from(all)));
    } catch {}
  };

  const handleClick = (item: NotifItem) => {
    const next = new Set(readIds);
    next.add(item.id);
    setReadIds(next);
    try {
      localStorage.setItem(READ_KEY(userId), JSON.stringify(Array.from(next)));
    } catch {}
    setOpen(false);
    navigate(item.href);
  };

  const iconFor = (k: NotifKind) => {
    switch (k) {
      case "task": return <ListChecks className="h-4 w-4 text-primary" />;
      case "validation": return <ClipboardCheck className="h-4 w-4 text-amber-500" />;
      case "request": return <FileEdit className="h-4 w-4 text-blue-500" />;
      case "alert": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
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
            cursor: "pointer",
          }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: "hsl(var(--destructive))",
                color: "white",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid var(--surface)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold text-sm">Notifications</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => {
                const isRead = readIds.has(it.id);
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => handleClick(it)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition flex gap-3 ${
                        isRead ? "opacity-60" : ""
                      }`}
                    >
                      <div className="mt-0.5">{iconFor(it.kind)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{it.title}</div>
                        {it.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(it.createdAt), { locale: fr, addSuffix: true })}
                        </div>
                      </div>
                      {!isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
