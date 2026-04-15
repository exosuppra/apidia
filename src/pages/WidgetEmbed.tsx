import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type WidgetFiche = {
  fiche_id: string;
  fiche_type: string;
  nom: string;
  commune: string;
  horaires: string | null;
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

  if (loading) return <div className="flex items-center justify-center p-8 text-sm text-gray-500">Chargement...</div>;
  if (error) return <div className="flex items-center justify-center p-8 text-sm text-red-500">{error}</div>;
  if (!data || data.fiches.length === 0) return <div className="flex items-center justify-center p-8 text-sm text-gray-500">Aucune fiche à afficher</div>;

  const { widget, fiches } = data;
  const theme = widget.settings?.theme || "light";
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const cardClass = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  return (
    <div className={`p-4 ${bgClass}`} style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="space-y-4">
        {fiches.map((f) => (
          <div key={f.fiche_id} className={`rounded-lg border p-4 ${cardClass}`}>
            <h3 className="font-semibold text-sm mb-1">{f.nom}</h3>
            {f.commune && (
              <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{f.commune}</p>
            )}
            {f.horaires ? (
              <pre className={`text-xs whitespace-pre-wrap font-sans leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {f.horaires}
              </pre>
            ) : (
              <p className={`text-xs italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>Horaires non renseignés</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
