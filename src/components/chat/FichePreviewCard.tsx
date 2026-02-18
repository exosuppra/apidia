import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, Clock, Info, Phone, Mail, Globe, Euro } from "lucide-react";

export interface FichePreview {
  fiche_id: string;
  nom: string;
  type: string;
  commune: string;
  description?: string;
  date_debut?: string;
  heure_debut?: string;
  date_fin?: string;
  image_url?: string;
  adresse?: string;
  code_postal?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  tarif?: string;
  verified_opening?: boolean;
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

const TYPE_COLORS: Record<string, string> = {
  FETE_ET_MANIFESTATION: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ACTIVITE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PATRIMOINE_CULTUREL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  RESTAURATION: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  HEBERGEMENT_LOCATIF: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HEBERGEMENT_COLLECTIF: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  DEGUSTATION: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const TYPE_GRADIENTS: Record<string, string> = {
  FETE_ET_MANIFESTATION: "from-purple-400 to-pink-500",
  ACTIVITE: "from-green-400 to-emerald-500",
  PATRIMOINE_CULTUREL: "from-amber-400 to-orange-500",
  RESTAURATION: "from-orange-400 to-red-500",
  HEBERGEMENT_LOCATIF: "from-blue-400 to-cyan-500",
  HEBERGEMENT_COLLECTIF: "from-blue-400 to-indigo-500",
  STRUCTURE: "from-gray-400 to-slate-500",
  COMMERCE_ET_SERVICE: "from-teal-400 to-green-500",
  EQUIPEMENT: "from-slate-400 to-gray-500",
  SEJOUR_PACKAGE: "from-indigo-400 to-purple-500",
  DEGUSTATION: "from-red-400 to-rose-500",
};

function formatDateHeure(dateDebut?: string, heureDebut?: string, dateFin?: string): string | null {
  if (!dateDebut) return null;
  try {
    const debut = parseISO(dateDebut);
    const debutStr = format(debut, "d MMMM yyyy", { locale: fr });
    if (dateFin && dateFin !== dateDebut) {
      const fin = parseISO(dateFin);
      const finStr = format(fin, "d MMMM yyyy", { locale: fr });
      const heureStr = heureDebut ? ` à ${heureDebut}` : "";
      return `Du ${debutStr}${heureStr} au ${finStr}`;
    }
    const heureStr = heureDebut ? ` à ${heureDebut}` : "";
    return `${debutStr}${heureStr}`;
  } catch {
    return null;
  }
}

function buildFullAddress(fiche: FichePreview): string | null {
  const street = fiche.adresse;
  const cityLine = [fiche.code_postal, fiche.commune].filter(Boolean).join(" ");
  const parts = [street, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function FichePreviewCard({ fiche }: FichePreviewCardProps) {
  const [open, setOpen] = useState(false);
  const icon = TYPE_ICONS[fiche.type] || "📌";
  const label = TYPE_LABELS[fiche.type] || fiche.type;
  const dateStr = formatDateHeure(fiche.date_debut, fiche.heure_debut, fiche.date_fin);
  const gradient = TYPE_GRADIENTS[fiche.type] || "from-primary to-primary/60";
  const badgeColor = TYPE_COLORS[fiche.type] || "bg-muted text-muted-foreground";
  const fullAddress = buildFullAddress(fiche);

  return (
    <>
      <div
        className="flex-shrink-0 w-52 rounded-lg border bg-background hover:bg-muted/50 transition-all cursor-pointer shadow-sm hover:shadow-md overflow-hidden group"
        onClick={() => setOpen(true)}
      >
        {/* Image / placeholder */}
        {fiche.image_url ? (
          <div className="h-28 w-full overflow-hidden">
            <img
              src={fiche.image_url}
              alt={fiche.nom}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className={`h-28 w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-4xl drop-shadow">{icon}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-2.5">
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <p className="font-semibold text-xs leading-tight line-clamp-2 text-foreground flex-1">
              {fiche.nom}
            </p>
            {fiche.verified_opening && (
              <span className="text-[10px] shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded font-medium">✅</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{fiche.commune}</span>
          </div>
          {dateStr && (
            <div className="flex items-center gap-1 text-xs text-primary font-medium mb-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">{dateStr}</span>
            </div>
          )}
          {fiche.tarif && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              <Euro className="h-3 w-3 shrink-0" />
              <span className="truncate">{fiche.tarif}</span>
            </div>
          )}
          {(fiche.telephone || fiche.email) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {fiche.telephone && <Phone className="h-3 w-3 shrink-0" />}
              {fiche.telephone && <span className="truncate">{fiche.telephone}</span>}
            </div>
          )}
          <div className="mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeColor}`}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <span className="text-xl">{icon}</span>
              <span className="leading-tight">{fiche.nom}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image */}
            {fiche.image_url ? (
              <div className="rounded-lg overflow-hidden h-48">
                <img src={fiche.image_url} alt={fiche.nom} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`rounded-lg h-32 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-5xl drop-shadow">{icon}</span>
              </div>
            )}

            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${badgeColor}`}>
              {label}
            </span>

            {/* Info rows */}
            <div className="space-y-2.5">
              {/* Address */}
              {(fullAddress || fiche.commune) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{fullAddress || fiche.commune}</span>
                </div>
              )}

              {/* Date */}
              {dateStr && (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{dateStr}</span>
                </div>
              )}
              {fiche.heure_debut && !dateStr?.includes("à") && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{fiche.heure_debut}</span>
                </div>
              )}

              {/* Tarif */}
              {fiche.tarif && (
                <div className="flex items-start gap-2 text-sm">
                  <Euro className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">{fiche.tarif}</span>
                </div>
              )}

              {/* Téléphone */}
              {fiche.telephone && (
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <a href={`tel:${fiche.telephone}`} className="text-primary hover:underline">
                    {fiche.telephone}
                  </a>
                </div>
              )}

              {/* Email */}
              {fiche.email && (
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <a href={`mailto:${fiche.email}`} className="text-primary hover:underline break-all">
                    {fiche.email}
                  </a>
                </div>
              )}

              {/* Site web */}
              {fiche.site_web && (
                <div className="flex items-start gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <a
                    href={fiche.site_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {fiche.site_web}
                  </a>
                </div>
              )}

              {/* Description */}
              {fiche.description && (
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-muted-foreground leading-relaxed">{fiche.description}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground/50">ID : {fiche.fiche_id}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
