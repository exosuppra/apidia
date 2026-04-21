import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type WidgetFiche = {
  fiche_id: string;
  fiche_type: string;
  nom: string;
  commune: string;
  code_postal?: string;
  adresse?: string;
  horaires: string | null;
  description_courte?: string;
  description_detaillee?: string;
  telephone?: string | null;
  email?: string | null;
  site_web?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  image_url: string | null;
  images?: string[];
};

type WidgetData = {
  widget: { name: string; type: string; settings: any };
  fiches: WidgetFiche[];
};

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  try {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (end && end !== start) return `Du ${fmt(start)} au ${fmt(end)}`;
    return fmt(start);
  } catch {
    return null;
  }
}

export default function WidgetEmbed() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WidgetFiche | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-widget-data?token=${token}`
        );
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || "Erreur");
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Auto-resize iframe
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "apidia-widget-resize", height }, "*");
    };
    sendHeight();
    const interval = setInterval(sendHeight, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    window.addEventListener("resize", sendHeight);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener("resize", sendHeight);
    };
  }, [data, selected]);

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const baseFont = "system-ui, -apple-system, sans-serif";

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: baseFont }}>Chargement...</div>;
  if (error) return <div style={{ padding: 32, textAlign: "center", color: "#e53e3e", fontFamily: baseFont }}>{error}</div>;
  if (!data || data.fiches.length === 0) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: baseFont }}>Aucune fiche à afficher</div>;

  const { fiches } = data;
  const dateRange = (f: WidgetFiche) => formatDateRange(f.date_debut, f.date_fin);

  return (
    <div style={{ fontFamily: baseFont, padding: 0, margin: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {fiches.map((f) => {
          const desc = f.description_courte || f.description_detaillee || "";
          const dr = dateRange(f);
          return (
            <button
              key={f.fiche_id}
              type="button"
              onClick={() => setSelected(f)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                transition: "transform .15s ease, box-shadow .15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
              }}
            >
              <div style={{ width: "100%", height: 160, overflow: "hidden", background: "#f3f4f6" }}>
                {f.image_url ? (
                  <img src={f.image_url} alt={f.nom} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>📍</div>
                )}
              </div>

              <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{f.nom}</h3>
                {f.commune && (
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>📍 {f.commune}</p>
                )}
                {dr && (
                  <p style={{ margin: 0, fontSize: 12, color: "#2563eb", fontWeight: 500 }}>📅 {dr}</p>
                )}
                {desc && (
                  <p style={{
                    margin: "4px 0 0",
                    fontSize: 12.5,
                    color: "#374151",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {desc}
                  </p>
                )}
                <span style={{ marginTop: 8, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>Voir le détail →</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal détails */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, maxWidth: 640, width: "100%",
              maxHeight: "90vh", overflowY: "auto", position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Fermer"
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 2,
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 18,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>

            {selected.image_url && (
              <div style={{ width: "100%", height: 240, overflow: "hidden", background: "#f3f4f6", borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
                <img src={selected.image_url} alt={selected.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}

            <div style={{ padding: 24 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{selected.nom}</h2>

              {(selected.adresse || selected.commune) && (
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#6b7280" }}>
                  📍 {[selected.adresse, [selected.code_postal, selected.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                </p>
              )}

              {dateRange(selected) && (
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#2563eb", fontWeight: 600 }}>📅 {dateRange(selected)}</p>
              )}

              {selected.horaires && (
                <div style={{ margin: "0 0 14px", padding: "10px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  🕒 {selected.horaires}
                </div>
              )}

              {(selected.description_detaillee || selected.description_courte) && (
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selected.description_detaillee || selected.description_courte}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                {selected.telephone && (
                  <a href={`tel:${selected.telephone}`} style={{ color: "#2563eb", textDecoration: "none" }}>📞 {selected.telephone}</a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}>✉️ {selected.email}</a>
                )}
                {selected.site_web && (
                  <a href={selected.site_web} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}>🌐 {selected.site_web}</a>
                )}
              </div>

              <p style={{ marginTop: 20, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>Apidae #{selected.fiche_id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
