import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type WidgetFiche = {
  fiche_id: string;
  fiche_type: string;
  nom: string;
  commune: string;
  code_postal: string;
  description_courte: string;
  description_detaillee: string;
  image: string | null;
  lat: number | null;
  lng: number | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
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
  const [carouselIdx, setCarouselIdx] = useState(0);

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

  const FicheCard = ({ fiche }: { fiche: WidgetFiche }) => (
    <div className={`rounded-lg border overflow-hidden shadow-sm ${cardClass}`}>
      {fiche.image && (
        <div className="h-40 overflow-hidden">
          <img
            src={fiche.image}
            alt={fiche.nom}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{fiche.nom}</h3>
        {fiche.commune && (
          <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {fiche.commune}{fiche.code_postal ? ` (${fiche.code_postal})` : ""}
          </p>
        )}
        {fiche.description_courte && (
          <p className={`text-xs line-clamp-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            {fiche.description_courte}
          </p>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          {fiche.telephone && (
            <a href={`tel:${fiche.telephone}`} className="text-xs text-blue-500 hover:underline">📞 Appeler</a>
          )}
          {fiche.site_web && (
            <a href={fiche.site_web} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">🌐 Site web</a>
          )}
        </div>
      </div>
    </div>
  );

  if (widget.type === "carousel") {
    return (
      <div className={`p-4 ${bgClass}`} style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
            >
              {fiches.map((f) => (
                <div key={f.fiche_id} className="min-w-full px-2">
                  <FicheCard fiche={f} />
                </div>
              ))}
            </div>
          </div>
          {fiches.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              <button
                onClick={() => setCarouselIdx(Math.max(0, carouselIdx - 1))}
                disabled={carouselIdx === 0}
                className={`px-3 py-1 rounded text-xs ${isDark ? "bg-gray-700 text-gray-300 disabled:opacity-30" : "bg-gray-100 text-gray-600 disabled:opacity-30"}`}
              >←</button>
              <span className={`text-xs py-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {carouselIdx + 1} / {fiches.length}
              </span>
              <button
                onClick={() => setCarouselIdx(Math.min(fiches.length - 1, carouselIdx + 1))}
                disabled={carouselIdx === fiches.length - 1}
                className={`px-3 py-1 rounded text-xs ${isDark ? "bg-gray-700 text-gray-300 disabled:opacity-30" : "bg-gray-100 text-gray-600 disabled:opacity-30"}`}
              >→</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (widget.type === "grid") {
    return (
      <div className={`p-4 ${bgClass}`} style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fiches.map((f) => (
            <FicheCard key={f.fiche_id} fiche={f} />
          ))}
        </div>
      </div>
    );
  }

  if (widget.type === "map") {
    const fichesWithCoords = fiches.filter((f) => f.lat && f.lng);
    return (
      <div className={`p-4 ${bgClass}`} style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className={`rounded-lg border p-4 ${cardClass}`}>
          <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {fichesWithCoords.length} point(s) sur la carte
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fichesWithCoords.map((f) => (
              <div key={f.fiche_id} className={`p-3 rounded border ${isDark ? "border-gray-600" : "border-gray-200"}`}>
                <p className="font-medium text-sm">{f.nom}</p>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{f.commune}</p>
                <a
                  href={`https://www.google.com/maps?q=${f.lat},${f.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                >
                  📍 Voir sur la carte
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
