import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type WidgetFiche = {
  fiche_id: string;
  fiche_type: string;
  nom: string;
  commune: string;
  horaires: string | null;
  image_url: string | null;
};

type WidgetData = {
  widget: {
    name: string;
    type: string;
    settings: any;
  };
  fiches: WidgetFiche[];
};

export default function WidgetEmbed() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: "system-ui, sans-serif" }}>Chargement...</div>;
  if (error) return <div style={{ padding: 32, textAlign: "center", color: "#e53e3e", fontFamily: "system-ui, sans-serif" }}>{error}</div>;
  if (!data || data.fiches.length === 0) return <div style={{ padding: 32, textAlign: "center", color: "#888", fontFamily: "system-ui, sans-serif" }}>Aucune fiche à afficher</div>;

  const { fiches } = data;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 0, margin: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {fiches.map((f) => (
          <div
            key={f.fiche_id}
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {/* Image */}
            <div style={{ width: "100%", height: 160, overflow: "hidden", background: "#f3f4f6" }}>
              {f.image_url ? (
                <img
                  src={f.image_url}
                  alt={f.nom}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
                  📍
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: "12px 16px 16px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>
                {f.nom}
              </h3>
              {f.commune && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                  📍 {f.commune}
                </p>
              )}
              {f.horaires ? (
                <pre style={{
                  margin: 0,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.5,
                  color: "#374151",
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}>
                  {f.horaires}
                </pre>
              ) : (
                <p style={{ margin: 0, fontSize: 12, fontStyle: "italic", color: "#9ca3af" }}>
                  Horaires non renseignés
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
