import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Bed, 
  Star, 
  Utensils, 
  Users, 
  Wifi, 
  Car, 
  Trees,
  Home,
  Activity,
  Sparkles,
  Shield,
  CheckCircle2
} from "lucide-react";

interface FicheCaracteristiquesTabProps {
  data: Record<string, unknown>;
  ficheType: string;
}

// Helper functions
const get = (obj: unknown, path: string, defaultValue: unknown = undefined): unknown => {
  const keys = path.split('.');
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  return result ?? defaultValue;
};

const getString = (obj: unknown, path: string, defaultValue = ''): string => {
  const value = get(obj, path, defaultValue);
  return typeof value === 'string' ? value : defaultValue;
};

const getNumber = (obj: unknown, path: string, defaultValue = 0): number => {
  const value = get(obj, path, defaultValue);
  return typeof value === 'number' ? value : defaultValue;
};

const getArray = (obj: unknown, path: string): unknown[] => {
  const value = get(obj, path, []);
  return Array.isArray(value) ? value : [];
};

// Section component
const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </div>
    <div className="pl-6 space-y-2">
      {children}
    </div>
  </div>
);

// Badge group for prestations
const PrestationBadges = ({ items, label, icon: Icon }: { items: unknown[]; label: string; icon: React.ElementType }) => {
  if (items.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => {
          const label = getString(item, 'libelleFr') || String(item);
          if (!label) return null;
          return (
            <Badge key={index} variant="outline" className="text-xs">
              {label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

// Info row component
const InfoRow = ({ label, value }: { label: string; value: string | number | React.ReactNode }) => {
  if (!value || value === '' || value === 0) return null;
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
      <span className="text-muted-foreground min-w-[140px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

export function FicheCaracteristiquesTab({ data, ficheType }: FicheCaracteristiquesTabProps) {
  // Capacité (pour hébergements)
  const capacite = get(data, 'informationsHebergementLocatif.capacite') || 
                   get(data, 'informationsHotellerie.capacite') ||
                   get(data, 'informationsHebergementCollectif.capacite') ||
                   get(data, 'informationsHotelleriePleinAir.capacite');
  
  const nombreChambres = getNumber(capacite, 'nombreChambres');
  const nombrePersonnes = getNumber(capacite, 'capaciteMaximumPossible') || getNumber(capacite, 'nombrePersonnesMaxi');
  const nombreLits = getNumber(capacite, 'nombreLits');
  const nombreEmplacements = getNumber(capacite, 'nombreEmplacements');
  const nombreMobilesHomes = getNumber(capacite, 'nombreMobilesHomes');
  const superficie = getNumber(capacite, 'superficie');
  
  // Classement (étoiles, labels)
  const classements = getArray(data, 'informationsHebergementLocatif.classement') ||
                      getArray(data, 'informationsHotellerie.classement') ||
                      getArray(data, 'classements');
  const classementPrefectoral = getNumber(data, 'informationsHebergementLocatif.classementPrefectoral') ||
                                 getNumber(data, 'informationsHotellerie.classementPrefectoral');
  
  // Labels qualité
  const labelsQualite = getArray(data, 'labels') || getArray(data, 'informationsHebergementLocatif.labels');
  
  // Restauration
  const nombreCouverts = getNumber(data, 'informationsRestauration.nombreDeCouvertsSalleInterieure') +
                         getNumber(data, 'informationsRestauration.nombreDeCouvertsTerrasse');
  const cuisines = getArray(data, 'informationsRestauration.specialites') ||
                   getArray(data, 'informationsRestauration.cuisines');
  
  // Prestations
  const services = getArray(data, 'prestations.services');
  const equipements = getArray(data, 'prestations.equipements');
  const conforts = getArray(data, 'prestations.conforts');
  const activites = getArray(data, 'prestations.activites');
  const typesClientele = getArray(data, 'prestations.typesClientele');
  const animauxAcceptes = getString(data, 'prestations.animauxAcceptes');
  const animauxAcceptesSupp = getString(data, 'prestations.animauxAcceptesSupplement');
  const languesParlees = getArray(data, 'prestations.languesParlees');
  
  // Environnement
  const environnements = getArray(data, 'localisation.environnements');
  
  // Activité
  const typesActivite = getArray(data, 'informationsActivite.activiteCategories') ||
                        getArray(data, 'informationsActivite.activitesSportives');
  
  // Patrimoine
  const themes = getArray(data, 'informationsPatrimoineCulturel.themes') ||
                 getArray(data, 'informationsPatrimoineNaturel.themes');
  const categories = getArray(data, 'informationsPatrimoineCulturel.categories') ||
                     getArray(data, 'informationsPatrimoineNaturel.categories');
  
  // Equipement
  const typesEquipement = getArray(data, 'informationsEquipement.rubrique');
  
  // Critères internes
  const criteresInternes = getArray(data, 'criteresInternes');
  
  const hasPrestations = services.length > 0 || equipements.length > 0 || conforts.length > 0 || 
                         activites.length > 0 || typesClientele.length > 0;
  const hasCapacite = nombreChambres > 0 || nombrePersonnes > 0 || nombreLits > 0 || 
                      nombreEmplacements > 0 || superficie > 0;
  const hasClassement = classements.length > 0 || classementPrefectoral > 0 || labelsQualite.length > 0;

  // Check if there's any content to show
  const hasContent = hasPrestations || hasCapacite || hasClassement || 
                     nombreCouverts > 0 || cuisines.length > 0 ||
                     typesActivite.length > 0 || themes.length > 0 || categories.length > 0 ||
                     typesEquipement.length > 0 || environnements.length > 0 ||
                     criteresInternes.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucune caractéristique disponible pour cette fiche</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacité - pour hébergements */}
      {hasCapacite && (
        <Section title="Capacité" icon={Bed}>
          {nombreChambres > 0 && <InfoRow label="Chambres" value={nombreChambres} />}
          {nombrePersonnes > 0 && <InfoRow label="Personnes max" value={`${nombrePersonnes} personnes`} />}
          {nombreLits > 0 && <InfoRow label="Lits" value={nombreLits} />}
          {nombreEmplacements > 0 && <InfoRow label="Emplacements" value={nombreEmplacements} />}
          {nombreMobilesHomes > 0 && <InfoRow label="Mobil-homes" value={nombreMobilesHomes} />}
          {superficie > 0 && <InfoRow label="Superficie" value={`${superficie} m²`} />}
        </Section>
      )}

      {hasCapacite && hasClassement && <Separator />}

      {/* Classement - étoiles, labels */}
      {hasClassement && (
        <Section title="Classement & Labels" icon={Star}>
          {classementPrefectoral > 0 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: classementPrefectoral }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm ml-2">{classementPrefectoral} étoiles</span>
            </div>
          )}
          {classements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {classements.map((cl, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {getString(cl, 'libelleFr') || String(cl)}
                </Badge>
              ))}
            </div>
          )}
          {labelsQualite.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {labelsQualite.map((label, index) => (
                <Badge key={index} variant="default" className="text-xs bg-amber-600 hover:bg-amber-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {getString(label, 'libelleFr') || String(label)}
                </Badge>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Restauration */}
      {(nombreCouverts > 0 || cuisines.length > 0) && (
        <>
          <Separator />
          <Section title="Restauration" icon={Utensils}>
            {nombreCouverts > 0 && <InfoRow label="Couverts" value={`${nombreCouverts} couverts`} />}
            {cuisines.length > 0 && (
              <PrestationBadges items={cuisines} label="Types de cuisine" icon={Utensils} />
            )}
          </Section>
        </>
      )}

      {/* Types d'activité */}
      {typesActivite.length > 0 && (
        <>
          <Separator />
          <Section title="Types d'activité" icon={Activity}>
            <div className="flex flex-wrap gap-1.5">
              {typesActivite.map((act, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {getString(act, 'libelleFr') || String(act)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Thèmes & Catégories - Patrimoine */}
      {(themes.length > 0 || categories.length > 0) && (
        <>
          <Separator />
          <Section title="Thèmes & Catégories" icon={Trees}>
            {categories.length > 0 && (
              <PrestationBadges items={categories} label="Catégories" icon={Building2} />
            )}
            {themes.length > 0 && (
              <PrestationBadges items={themes} label="Thèmes" icon={Sparkles} />
            )}
          </Section>
        </>
      )}

      {/* Types d'équipement */}
      {typesEquipement.length > 0 && (
        <>
          <Separator />
          <Section title="Type d'équipement" icon={Building2}>
            <div className="flex flex-wrap gap-1.5">
              {typesEquipement.map((eq, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {getString(eq, 'libelleFr') || String(eq)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Environnement */}
      {environnements.length > 0 && (
        <>
          <Separator />
          <Section title="Environnement" icon={Trees}>
            <div className="flex flex-wrap gap-1.5">
              {environnements.map((env, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {getString(env, 'libelleFr') || String(env)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Prestations */}
      {hasPrestations && (
        <>
          <Separator />
          <Section title="Prestations" icon={Sparkles}>
            <div className="space-y-4">
              <PrestationBadges items={services} label="Services" icon={CheckCircle2} />
              <PrestationBadges items={equipements} label="Équipements" icon={Wifi} />
              <PrestationBadges items={conforts} label="Conforts" icon={Home} />
              <PrestationBadges items={activites} label="Activités" icon={Activity} />
              <PrestationBadges items={typesClientele} label="Clientèle" icon={Users} />
              
              {languesParlees.length > 0 && (
                <PrestationBadges items={languesParlees} label="Langues parlées" icon={Users} />
              )}
              
              {(animauxAcceptes || animauxAcceptesSupp) && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Animaux acceptés:</span>{' '}
                  <span className="text-foreground">
                    {animauxAcceptes === 'ACCEPTES' ? 'Oui' : 
                     animauxAcceptesSupp === 'ACCEPTES_AVEC_SUPPLEMENT' ? 'Oui (avec supplément)' : 
                     animauxAcceptes === 'NON_ACCEPTES' ? 'Non' : animauxAcceptes}
                  </span>
                </div>
              )}
            </div>
          </Section>
        </>
      )}

      {/* Critères internes */}
      {criteresInternes.length > 0 && (
        <>
          <Separator />
          <Section title="Critères internes" icon={Shield}>
            <div className="space-y-2">
              {criteresInternes.map((critere, index) => {
                const libelle = getString(critere, 'libelle.libelleFr');
                const commentaire = getString(critere, 'commentaire.libelleFr');
                if (!libelle) return null;
                
                return (
                  <div key={index} className="p-2 rounded-md bg-muted/50 text-sm">
                    <span className="font-medium">{libelle}</span>
                    {commentaire && (
                      <p className="text-muted-foreground text-xs mt-1">{commentaire}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
