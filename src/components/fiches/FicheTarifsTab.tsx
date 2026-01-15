import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Euro, 
  CreditCard, 
  Calendar,
  Info,
  Gift,
  Tag
} from "lucide-react";

interface FicheTarifsTabProps {
  data: Record<string, unknown>;
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

export function FicheTarifsTab({ data }: FicheTarifsTabProps) {
  // Indication tarifaire générale
  const indicationTarif = getString(data, 'descriptionTarif.indicationTarif');
  const gratuit = get(data, 'descriptionTarif.gratuit') === true;
  
  // Tarif en clair (texte)
  const tarifEnClair = getString(data, 'descriptionTarif.tarifsEnClair.libelleFr');
  const tarifEnClairGestion = getString(data, 'descriptionTarif.tarifsEnClairGestion.libelleFr');
  
  // Complément tarifaire
  const complementTarif = getString(data, 'descriptionTarif.complement.libelleFr');
  
  // Périodes tarifaires
  const periodesTarifs = getArray(data, 'descriptionTarif.periodes');
  
  // Modes de paiement
  const modesPaiement = getArray(data, 'descriptionTarif.modesPaiement');
  
  // Devise
  const devise = getString(data, 'descriptionTarif.devise.libelleFr') || 'EUR';
  
  // Ce que le tarif comprend/ne comprend pas
  const tarifComprend = getArray(data, 'descriptionTarif.tarifComprend');
  const tarifNonComprend = getArray(data, 'descriptionTarif.tarifNonComprend');

  // Check if there's any content
  const hasContent = indicationTarif || gratuit || tarifEnClair || tarifEnClairGestion ||
                     complementTarif || periodesTarifs.length > 0 || modesPaiement.length > 0 ||
                     tarifComprend.length > 0 || tarifNonComprend.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Euro className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucune information tarifaire disponible</p>
      </div>
    );
  }

  const formatPrice = (tarif: unknown): string => {
    const min = getNumber(tarif, 'minimum');
    const max = getNumber(tarif, 'maximum');
    const type = getString(tarif, 'type.libelleFr');
    
    if (min && max && min !== max) {
      return `${min} - ${max} € ${type ? `(${type})` : ''}`;
    } else if (min) {
      return `${min} € ${type ? `(${type})` : ''}`;
    } else if (max) {
      return `jusqu'à ${max} € ${type ? `(${type})` : ''}`;
    }
    return type || '';
  };

  return (
    <div className="space-y-6">
      {/* Indication générale */}
      <Section title="Indication tarifaire" icon={Tag}>
        <div className="flex items-center gap-3">
          {gratuit ? (
            <Badge variant="default" className="text-sm bg-green-600 hover:bg-green-700">
              <Gift className="h-3.5 w-3.5 mr-1" />
              Gratuit
            </Badge>
          ) : indicationTarif ? (
            <Badge variant={indicationTarif === 'PAYANT' ? 'secondary' : 'outline'} className="text-sm">
              <Euro className="h-3.5 w-3.5 mr-1" />
              {indicationTarif === 'PAYANT' ? 'Payant' : 
               indicationTarif === 'GRATUIT' ? 'Gratuit' : indicationTarif}
            </Badge>
          ) : null}
        </div>
      </Section>

      {/* Tarif en clair */}
      {(tarifEnClair || tarifEnClairGestion) && (
        <>
          <Separator />
          <Section title="Tarifs" icon={Euro}>
            {tarifEnClair && (
              <p className="text-sm whitespace-pre-wrap">{tarifEnClair}</p>
            )}
            {tarifEnClairGestion && !tarifEnClair && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{tarifEnClairGestion}</p>
            )}
          </Section>
        </>
      )}

      {/* Complément tarifaire */}
      {complementTarif && (
        <>
          <Separator />
          <Section title="Complément" icon={Info}>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{complementTarif}</p>
          </Section>
        </>
      )}

      {/* Périodes tarifaires détaillées */}
      {periodesTarifs.length > 0 && (
        <>
          <Separator />
          <Section title="Périodes tarifaires" icon={Calendar}>
            <div className="space-y-3">
              {periodesTarifs.map((periode, index) => {
                const dateDebut = getString(periode, 'dateDebut');
                const dateFin = getString(periode, 'dateFin');
                const tarifs = getArray(periode, 'tarifs');
                const complement = getString(periode, 'complement.libelleFr');
                
                return (
                  <div key={index} className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
                    {/* Dates de la période */}
                    {(dateDebut || dateFin) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {dateDebut && dateFin ? (
                          <span>Du {new Date(dateDebut).toLocaleDateString('fr-FR')} au {new Date(dateFin).toLocaleDateString('fr-FR')}</span>
                        ) : dateDebut ? (
                          <span>À partir du {new Date(dateDebut).toLocaleDateString('fr-FR')}</span>
                        ) : (
                          <span>Jusqu'au {new Date(dateFin!).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Tarifs de la période */}
                    {tarifs.length > 0 && (
                      <div className="space-y-1 pl-4 border-l-2 border-primary/30">
                        {tarifs.map((tarif, tIndex) => {
                          const priceStr = formatPrice(tarif);
                          if (!priceStr) return null;
                          
                          return (
                            <div key={tIndex} className="flex items-center gap-2">
                              <Euro className="h-3 w-3 text-muted-foreground" />
                              <span>{priceStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Complément de période */}
                    {complement && (
                      <p className="text-xs text-muted-foreground italic">{complement}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* Ce que le tarif comprend */}
      {tarifComprend.length > 0 && (
        <>
          <Separator />
          <Section title="Le tarif comprend" icon={Gift}>
            <div className="flex flex-wrap gap-1.5">
              {tarifComprend.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                  ✓ {getString(item, 'libelleFr') || String(item)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Ce que le tarif ne comprend pas */}
      {tarifNonComprend.length > 0 && (
        <>
          <Separator />
          <Section title="Le tarif ne comprend pas" icon={Info}>
            <div className="flex flex-wrap gap-1.5">
              {tarifNonComprend.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-red-50 border-red-300 text-red-700">
                  ✗ {getString(item, 'libelleFr') || String(item)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Modes de paiement */}
      {modesPaiement.length > 0 && (
        <>
          <Separator />
          <Section title="Modes de paiement" icon={CreditCard}>
            <div className="flex flex-wrap gap-1.5">
              {modesPaiement.map((mode, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {getString(mode, 'libelleFr') || String(mode)}
                </Badge>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
