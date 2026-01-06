import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Globe,
  FileText,
  Info,
  Image as ImageIcon,
  History,
  Pencil
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { FicheHistoryPanel } from "./FicheHistoryPanel";
import { FicheEditForm } from "./FicheEditForm";

interface FicheDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiche: {
    id: string;
    fiche_type: string;
    fiche_id: string;
    data: Json;
    updated_at: string;
    source: string;
    synced_to_sheets: boolean;
  } | null;
  onFicheUpdated?: () => void;
}

// Helper to safely get nested values
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
const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => {
  if (!value || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
      <span className="text-muted-foreground min-w-[140px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

export function FicheDetailsDialog({ open, onOpenChange, fiche, onFicheUpdated }: FicheDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  if (!fiche) return null;

  const data = fiche.data as Record<string, unknown>;
  
  const handleSave = () => {
    setIsEditing(false);
    onFicheUpdated?.();
  };
  
  // Extract main info
  const nom = getString(data, 'nom.libelleFr');
  const state = getString(data, 'state');
  const identifier = getString(data, 'identifier');
  
  // Localisation
  const adresse1 = getString(data, 'localisation.adresse.adresse1');
  const adresse2 = getString(data, 'localisation.adresse.adresse2');
  const codePostal = getString(data, 'localisation.adresse.codePostal');
  const commune = getString(data, 'localisation.adresse.commune.nom');
  const latitude = getNumber(data, 'localisation.geolocalisation.geoJson.coordinates.1');
  const longitude = getNumber(data, 'localisation.geolocalisation.geoJson.coordinates.0');
  
  // Gestion
  const dateCreation = getString(data, 'gestion.dateCreation');
  const dateModification = getString(data, 'gestion.dateModification');
  const proprietaire = getString(data, 'gestion.membreProprietaire.nom');
  
  // Contacts
  const contacts = getArray(data, 'contacts');
  
  // Communications (phone, email, website)
  const moyensCommunication = getArray(data, 'informations.moyensCommunication');
  
  // Ouverture
  const periodeEnClair = getString(data, 'ouverture.periodeEnClair.libelleFr');
  
  // Description
  const descriptionCourte = getString(data, 'presentation.descriptifCourt.libelleFr');
  const descriptionDetaille = getString(data, 'presentation.descriptifDetaille.libelleFr');

  // Médias - stored media (images stockées localement)
  const storedMedia = getArray(data, '_stored_media') as Array<{
    stored_url?: string;
    original_url?: string;
    nom?: string;
    legende?: string;
    copyright?: string;
    type?: string;
  }>;
  
  // Illustrations APIDAE (images originales)
  const illustrations = getArray(data, 'illustrations') as Array<{
    traductionFichiers?: Array<{
      url?: string;
      urlFiche?: string;
      urlListe?: string;
      urlDiaporama?: string;
    }>;
    nom?: { libelleFr?: string };
    legende?: { libelleFr?: string };
    copyright?: { libelleFr?: string };
    type?: string;
  }>;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PUBLISHED': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'HIDDEN': return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
      case 'DELETED': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCommunicationType = (item: unknown): { type: string; value: string } => {
    const typeLib = getString(item, 'type.libelleFr', '');
    const coordFr = getString(item, 'coordonnees.fr', '');
    const coordDirect = getString(item, 'coordonnees', '');
    return {
      type: typeLib,
      value: coordFr || coordDirect
    };
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setIsEditing(false);
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="truncate">{nom || `Fiche ${fiche.fiche_id}`}</span>
              <Badge variant="outline" className={getStateColor(state)}>
                {state || 'N/A'}
              </Badge>
            </DialogTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{fiche.fiche_type}</Badge>
            <span>•</span>
            <span>ID: {fiche.fiche_id}</span>
            {identifier && (
              <>
                <span>•</span>
                <span>{identifier}</span>
              </>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <ScrollArea className="h-[60vh] mt-4 pr-4">
            <FicheEditForm 
              fiche={fiche}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </ScrollArea>
        ) : (
          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="media">Médias</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="horaires">Horaires</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-3 w-3" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] mt-4 pr-4">
            <TabsContent value="general" className="space-y-6 mt-0">
              {/* Description */}
              {(descriptionCourte || descriptionDetaille) && (
                <Section title="Description" icon={FileText}>
                  {descriptionCourte && (
                    <p className="text-sm text-muted-foreground">{descriptionCourte}</p>
                  )}
                  {descriptionDetaille && (
                    <p className="text-sm text-foreground mt-2">{descriptionDetaille}</p>
                  )}
                </Section>
              )}

              <Separator />

              {/* Localisation */}
              <Section title="Localisation" icon={MapPin}>
                {adresse1 && <InfoRow label="Adresse" value={adresse1} />}
                {adresse2 && <InfoRow label="Complément" value={adresse2} />}
                <InfoRow label="Commune" value={`${codePostal} ${commune}`.trim()} />
                {latitude !== 0 && longitude !== 0 && (
                  <InfoRow 
                    label="Coordonnées" 
                    value={
                      <a 
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </a>
                    } 
                  />
                )}
              </Section>

              <Separator />

              {/* Gestion */}
              <Section title="Gestion" icon={Building2}>
                <InfoRow label="Propriétaire" value={proprietaire} />
                <InfoRow label="Créé le" value={formatDate(dateCreation)} />
                <InfoRow label="Modifié le" value={formatDate(dateModification)} />
                <InfoRow label="Source" value={fiche.source} />
                <InfoRow 
                  label="Sync Sheets" 
                  value={
                    <Badge variant={fiche.synced_to_sheets ? "default" : "secondary"}>
                      {fiche.synced_to_sheets ? 'Oui' : 'Non'}
                    </Badge>
                  } 
                />
              </Section>
            </TabsContent>

            <TabsContent value="media" className="space-y-6 mt-0">
              <Section title="Médias" icon={ImageIcon}>
                {storedMedia.length > 0 || illustrations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Afficher les médias stockés en priorité */}
                    {storedMedia.map((media, index) => (
                      <div key={`stored-${index}`} className="space-y-2">
                        <a 
                          href={media.stored_url || media.original_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={media.stored_url || media.original_url} 
                            alt={media.legende || media.nom || 'Image'}
                            className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                        <div className="text-xs space-y-0.5">
                          {media.legende && (
                            <p className="text-foreground line-clamp-2">{media.legende}</p>
                          )}
                          {media.copyright && (
                            <p className="text-muted-foreground">© {media.copyright}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Si pas de médias stockés, afficher les illustrations APIDAE */}
                    {storedMedia.length === 0 && illustrations.map((illus, index) => {
                      const fichier = illus.traductionFichiers?.[0];
                      const imageUrl = fichier?.urlFiche || fichier?.url;
                      if (!imageUrl) return null;
                      
                      return (
                        <div key={`illus-${index}`} className="space-y-2">
                          <a 
                            href={fichier?.url || imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={imageUrl} 
                              alt={illus.legende?.libelleFr || illus.nom?.libelleFr || 'Image'}
                              className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                          </a>
                          <div className="text-xs space-y-0.5">
                            {illus.legende?.libelleFr && (
                              <p className="text-foreground line-clamp-2">{illus.legende.libelleFr}</p>
                            )}
                            {illus.copyright?.libelleFr && (
                              <p className="text-muted-foreground">© {illus.copyright.libelleFr}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun média disponible</p>
                  </div>
                )}
              </Section>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6 mt-0">
              {/* Moyens de communication */}
              {moyensCommunication.length > 0 && (
                <Section title="Moyens de communication" icon={Phone}>
                  <div className="space-y-2">
                    {moyensCommunication.map((item, index) => {
                      const { type, value } = getCommunicationType(item);
                      if (!value) return null;
                      
                      const Icon = type.toLowerCase().includes('mel') || type.toLowerCase().includes('mail') 
                        ? Mail 
                        : type.toLowerCase().includes('site') || type.toLowerCase().includes('web')
                        ? Globe
                        : Phone;
                      
                      const isLink = value.startsWith('http') || type.toLowerCase().includes('site');
                      const isMail = type.toLowerCase().includes('mel') || type.toLowerCase().includes('mail');
                      
                      return (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-muted-foreground min-w-[100px] shrink-0">{type}:</span>
                          <div className="min-w-0 flex-1">
                            {isLink ? (
                              <a 
                                href={value} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary hover:underline break-all"
                              >
                                {value}
                              </a>
                            ) : isMail ? (
                              <a href={`mailto:${value}`} className="text-primary hover:underline break-all">
                                {value}
                              </a>
                            ) : (
                              <span className="break-all">{value}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {moyensCommunication.length > 0 && contacts.length > 0 && <Separator />}

              {/* Contacts */}
              {contacts.length > 0 && (
                <Section title="Contacts" icon={User}>
                  <div className="space-y-4">
                    {contacts.map((contact, index) => {
                      const civilite = getString(contact, 'civilite.libelleFr');
                      const nom = getString(contact, 'nom');
                      const prenom = getString(contact, 'prenom');
                      const fonction = getString(contact, 'fonction.libelleFr');
                      const referent = get(contact, 'referent') === true;
                      
                      return (
                        <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {[civilite, prenom, nom].filter(Boolean).join(' ')}
                            </span>
                            {referent && (
                              <Badge variant="outline" className="text-xs">Référent</Badge>
                            )}
                          </div>
                          {fonction && (
                            <p className="text-sm text-muted-foreground">{fonction}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {moyensCommunication.length === 0 && contacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune information de contact disponible</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="horaires" className="space-y-6 mt-0">
              <Section title="Horaires d'ouverture" icon={Clock}>
                {periodeEnClair ? (
                  <p className="text-sm">{periodeEnClair}</p>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune information d'horaires disponible</p>
                  </div>
                )}
              </Section>

              {/* Périodes détaillées */}
              {getArray(data, 'ouverture.periodesOuvertures').length > 0 && (
                <>
                  <Separator />
                  <Section title="Périodes détaillées" icon={Calendar}>
                    <div className="space-y-2">
                      {getArray(data, 'ouverture.periodesOuvertures').map((periode, index) => {
                        const dateDebut = getString(periode, 'dateDebut');
                        const dateFin = getString(periode, 'dateFin');
                        const type = getString(periode, 'type');
                        
                        return (
                          <div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{type}</Badge>
                              {dateDebut && dateFin && (
                                <span>
                                  Du {new Date(dateDebut).toLocaleDateString('fr-FR')} au {new Date(dateFin).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                              {dateFin && !dateDebut && (
                                <span>Jusqu'au {new Date(dateFin).toLocaleDateString('fr-FR')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <FicheHistoryPanel ficheId={fiche.fiche_id} />
            </TabsContent>

            <TabsContent value="json" className="mt-0">
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}