import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export interface FichePreview {
  fiche_id: string;
  nom: string;
  type: string;
  commune: string;
  description?: string;
  date_debut?: string;
  heure_debut?: string;
  date_fin?: string;
}

interface FichePreviewCardProps {
  fiche: FichePreview;
}

const TYPE_ICONS: Record<string, string> = {
  FETE_ET_MANIFESTATION: "🎭",
  ACTIVITE: "🏃",
  PATRIMOINE_CULTUREL: "🏛️",
  RESTAURATION: "🍽️",
  HEBERGEMENT_LOCATIF: "🏠",
  HEBERGEMENT_COLLECTIF: "🏨",
  STRUCTURE: "🏢",
  COMMERCE_ET_SERVICE: "🛍️",
  EQUIPEMENT: "⚙️",
  SEJOUR_PACKAGE: "🗺️",
  DEGUSTATION: "🍷",
};

const TYPE_LABELS: Record<string, string> = {
  FETE_ET_MANIFESTATION: "Manifestation",
  ACTIVITE: "Activité",
  PATRIMOINE_CULTUREL: "Patrimoine",
  RESTAURATION: "Restaurant",
  HEBERGEMENT_LOCATIF: "Hébergement",
  HEBERGEMENT_COLLECTIF: "Hébergement",
  STRUCTURE: "Structure",
  COMMERCE_ET_SERVICE: "Commerce",
  EQUIPEMENT: "Équipement",
  SEJOUR_PACKAGE: "Séjour",
  DEGUSTATION: "Dégustation",
};

function formatDateHeure(dateDebut?: string, heureDebut?: string, dateFin?: string): string | null {
  if (!dateDebut) return null;

  try {
    const debut = parseISO(dateDebut);
    const debutStr = format(debut, "d MMMM", { locale: fr });

    if (dateFin && dateFin !== dateDebut) {
      const fin = parseISO(dateFin);
      const finStr = format(fin, "d MMMM", { locale: fr });
      const heureStr = heureDebut ? ` à ${heureDebut}` : "";
      return `Du ${debutStr}${heureStr} au ${finStr}`;
    }

    const heureStr = heureDebut ? ` à ${heureDebut}` : "";
    return `${debutStr}${heureStr}`;
  } catch {
    return null;
  }
}

export default function FichePreviewCard({ fiche }: FichePreviewCardProps) {
  const icon = TYPE_ICONS[fiche.type] || "📌";
  const label = TYPE_LABELS[fiche.type] || fiche.type;
  const dateStr = formatDateHeure(fiche.date_debut, fiche.heure_debut, fiche.date_fin);

  return (
    <div className="flex-shrink-0 w-52 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer p-3 shadow-sm">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-lg leading-none mt-0.5">{icon}</span>
        <p className="font-semibold text-xs leading-tight line-clamp-2 text-foreground">
          {fiche.nom}
        </p>
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        {fiche.commune} · {label}
      </p>
      {dateStr && (
        <p className="text-xs text-primary font-medium mb-1">{dateStr}</p>
      )}
      {fiche.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
          {fiche.description}
        </p>
      )}
    </div>
  );
}
