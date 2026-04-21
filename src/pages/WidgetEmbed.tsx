import { useEffect, useRef, useState } from "react";
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

const baseFont = "system-ui, -apple-system, sans-serif";

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

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: baseFont }}>Chargement...</div>;
  if (error) return <div style={{ padding: 32, textAlign: "center", color: "#e53e3e", fontFamily: baseFont }}>{error}</div>;
  if (!data || data.fiches.length === 0) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: baseFont }}>Aucune fiche à afficher</div>;

  const { fiches, widget } = data;
  const widgetType = widget?.type || "grid";
  const showDescription = widget?.settings?.show_description !== false;

  return (
    <div style={{ fontFamily: baseFont, padding: 0, margin: 0 }}>
      {widgetType === "carousel" && <CarouselView fiches={fiches} onSelect={setSelected} showDescription={showDescription} />}
      {widgetType === "grid" && <GridView fiches={fiches} onSelect={setSelected} showDescription={showDescription} />}
      {widgetType === "map" && <MapListView fiches={fiches} onSelect={setSelected} showDescription={showDescription} />}

      {selected && <DetailModal fiche={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ===================== CARD ===================== */
function FicheCard({ f, onSelect, compact = false, showDescription = true }: { f: WidgetFiche; onSelect: (f: WidgetFiche) => void; compact?: boolean; showDescription?: boolean }) {
  const desc = showDescription ? (f.description_courte || f.description_detaillee || "") : "";
  const dr = formatDateRange(f.date_debut, f.date_fin);

  return (
    <button
      type="button"
      onClick={() => onSelect(f)}
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
        height: "100%",
        boxSizing: "border-box",
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
      <div style={{ width: "100%", height: compact ? 140 : 170, overflow: "hidden", background: "#f3f4f6", flexShrink: 0 }}>
        {f.image_url ? (
          <img src={f.image_url} alt={f.nom} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>📍</div>
        )}
      </div>

      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
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
            WebkitLineClamp: compact ? 3 : 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {desc}
          </p>
        )}
        <span style={{ marginTop: "auto", paddingTop: 8, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>Voir le détail →</span>
      </div>
    </button>
  );
}

/* ===================== GRID ===================== */
function GridView({ fiches, onSelect, showDescription }: { fiches: WidgetFiche[]; onSelect: (f: WidgetFiche) => void; showDescription: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {fiches.map((f) => <FicheCard key={f.fiche_id} f={f} onSelect={onSelect} showDescription={showDescription} />)}
    </div>
  );
}

/* ===================== CAROUSEL ===================== */
function CarouselView({ fiches, onSelect, showDescription }: { fiches: WidgetFiche[]; onSelect: (f: WidgetFiche) => void; showDescription: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth >= 768 ? 320 : el.clientWidth - 32;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 12,
          scrollbarWidth: "thin",
        }}
      >
        {fiches.map((f) => (
          <div
            key={f.fiche_id}
            style={{
              flex: "0 0 300px",
              maxWidth: 300,
              scrollSnapAlign: "start",
            }}
          >
            <FicheCard f={f} onSelect={onSelect} showDescription={showDescription} />
          </div>
        ))}
      </div>

      {fiches.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Précédent"
            onClick={() => scrollBy(-1)}
            style={carouselNavStyle("left")}
          >‹</button>
          <button
            type="button"
            aria-label="Suivant"
            onClick={() => scrollBy(1)}
            style={carouselNavStyle("right")}
          >›</button>
        </>
      )}
    </div>
  );
}

function carouselNavStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 4,
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    color: "#111827",
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  };
}

/* ===================== MAP / LIST ===================== */
function MapListView({ fiches, onSelect, showDescription }: { fiches: WidgetFiche[]; onSelect: (f: WidgetFiche) => void; showDescription: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fiches.map((f) => {
        const desc = showDescription ? (f.description_courte || f.description_detaillee || "") : "";
        const dr = formatDateRange(f.date_debut, f.date_fin);
        return (
          <button
            key={f.fiche_id}
            type="button"
            onClick={() => onSelect(f)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              gap: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f9fafb")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
          >
            <div style={{ flex: "0 0 120px", height: 110, background: "#f3f4f6", overflow: "hidden" }}>
              {f.image_url ? (
                <img src={f.image_url} alt={f.nom} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>📍</div>
              )}
            </div>
            <div style={{ flex: 1, padding: "10px 14px 10px 0", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{f.nom}</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                {f.commune && <span style={{ color: "#6b7280" }}>📍 {f.commune}</span>}
                {dr && <span style={{ color: "#2563eb", fontWeight: 500 }}>📅 {dr}</span>}
              </div>
              {desc && (
                <p style={{
                  margin: "2px 0 0",
                  fontSize: 12.5,
                  color: "#374151",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>{desc}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== MODAL ===================== */
function DetailModal({ fiche, onClose }: { fiche: WidgetFiche; onClose: () => void }) {
  const dr = formatDateRange(fiche.date_debut, fiche.date_fin);
  return (
    <div
      onClick={onClose}
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
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 2,
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>

        {fiche.image_url && (
          <div style={{ width: "100%", height: 240, overflow: "hidden", background: "#f3f4f6", borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
            <img src={fiche.image_url} alt={fiche.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}

        <div style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{fiche.nom}</h2>

          {(fiche.adresse || fiche.commune) && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#6b7280" }}>
              📍 {[fiche.adresse, [fiche.code_postal, fiche.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
            </p>
          )}

          {dr && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#2563eb", fontWeight: 600 }}>📅 {dr}</p>
          )}

          {fiche.horaires && (
            <div style={{ margin: "0 0 14px", padding: "10px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              🕒 {fiche.horaires}
            </div>
          )}

          {(fiche.description_detaillee || fiche.description_courte) && (
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {fiche.description_detaillee || fiche.description_courte}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            {fiche.telephone && (
              <a href={`tel:${fiche.telephone}`} style={{ color: "#2563eb", textDecoration: "none" }}>📞 {fiche.telephone}</a>
            )}
            {fiche.email && (
              <a href={`mailto:${fiche.email}`} style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}>✉️ {fiche.email}</a>
            )}
            {fiche.site_web && (
              <a href={fiche.site_web} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}>🌐 {fiche.site_web}</a>
            )}
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>Apidae #{fiche.fiche_id}</p>
        </div>
      </div>
    </div>
  );
}
