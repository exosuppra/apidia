import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Building2
} from "lucide-react";

interface FicheInfosLegalesSectionProps {
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

// Info row component
const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => {
  if (!value || value === '') return null;
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
      <span className="text-muted-foreground min-w-[140px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

export function FicheInfosLegalesSection({ data }: FicheInfosLegalesSectionProps) {
  // Informations légales
  const siret = getString(data, 'informations.informationsLegales.siret');
  const rcs = getString(data, 'informations.informationsLegales.rcs');
  const codeApe = getString(data, 'informations.informationsLegales.codeApeNaf');
  const numeroAgrementLicence = getString(data, 'informations.informationsLegales.numeroAgrementLicence');
  const numeroProfessionnel = getString(data, 'informations.informationsLegales.numeroProfessionnel');
  
  const hasInfosLegales = siret || rcs || codeApe || numeroAgrementLicence || numeroProfessionnel;

  if (!hasInfosLegales) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        Informations légales
      </div>
      <div className="pl-6 space-y-2">
        <InfoRow label="SIRET" value={siret} />
        <InfoRow label="RCS" value={rcs} />
        <InfoRow label="Code APE/NAF" value={codeApe} />
        <InfoRow label="N° Agrément/Licence" value={numeroAgrementLicence} />
        <InfoRow label="N° Professionnel" value={numeroProfessionnel} />
      </div>
    </div>
  );
}
