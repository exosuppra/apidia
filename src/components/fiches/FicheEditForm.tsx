import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, X, Plus, Trash2 } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface FicheEditFormProps {
  fiche: {
    id: string;
    fiche_id: string;
    fiche_type: string;
    data: Json;
  };
  onSave: () => void;
  onCancel: () => void;
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

// Helper to set nested value
const setNested = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
};

// Types de communication disponibles
const COMMUNICATION_TYPES = [
  { id: 201, label: 'Téléphone', keyword: 'téléphone' },
  { id: 202, label: 'Fax', keyword: 'fax' },
  { id: 204, label: 'Mél', keyword: 'mel' },
  { id: 205, label: 'Site web (URL)', keyword: 'site web' },
  { id: 207, label: 'Page Facebook', keyword: 'facebook' },
  { id: 3755, label: 'Twitter', keyword: 'twitter' },
  { id: 3751, label: 'Instagram', keyword: 'instagram' },
  { id: 3752, label: 'LinkedIn', keyword: 'linkedin' },
  { id: 206, label: 'Téléphone portable', keyword: 'portable' },
];

interface CommunicationItem {
  typeId: number;
  typeLabel: string;
  value: string;
}

interface PeriodeOuverture {
  dateDebut?: string;
  dateFin?: string;
  horaireOuverture?: string;
  horaireFermeture?: string;
  type?: string;
  tousLesAns?: boolean;
}

export function FicheEditForm({ fiche, onSave, onCancel }: FicheEditFormProps) {
  const { toast } = useToast();
  const data = fiche.data as Record<string, unknown>;
  
  // Form state - General
  const [nom, setNom] = useState(getString(data, 'nom.libelleFr'));
  const [descriptionCourte, setDescriptionCourte] = useState(getString(data, 'presentation.descriptifCourt.libelleFr'));
  const [descriptionDetaillee, setDescriptionDetaillee] = useState(getString(data, 'presentation.descriptifDetaille.libelleFr'));
  
  // Form state - Localisation
  const [adresse1, setAdresse1] = useState(getString(data, 'localisation.adresse.adresse1'));
  const [adresse2, setAdresse2] = useState(getString(data, 'localisation.adresse.adresse2'));
  const [codePostal, setCodePostal] = useState(getString(data, 'localisation.adresse.codePostal'));
  const [commune, setCommune] = useState(getString(data, 'localisation.adresse.commune.nom'));
  
  // Form state - Communications
  const [communications, setCommunications] = useState<CommunicationItem[]>(() => {
    const moyens = get(data, 'informations.moyensCommunication', []) as Array<Record<string, unknown>>;
    if (!Array.isArray(moyens)) return [];
    
    return moyens.map(m => {
      const typeLib = getString(m, 'type.libelleFr', '');
      const typeId = get(m, 'type.id', 0) as number;
      const coordFr = getString(m, 'coordonnees.fr', '');
      const coordDirect = typeof m.coordonnees === 'string' ? m.coordonnees : '';
      return {
        typeId: typeId,
        typeLabel: typeLib,
        value: coordFr || coordDirect
      };
    }).filter(c => c.value);
  });
  
  // Form state - Horaires
  const [periodeEnClair, setPeriodeEnClair] = useState(getString(data, 'ouverture.periodeEnClair.libelleFr'));
  const [periodesOuverture, setPeriodesOuverture] = useState<PeriodeOuverture[]>(() => {
    const periodes = get(data, 'ouverture.periodesOuvertures', []) as Array<Record<string, unknown>>;
    if (!Array.isArray(periodes)) return [];
    
    return periodes.map(p => ({
      dateDebut: getString(p, 'dateDebut'),
      dateFin: getString(p, 'dateFin'),
      horaireOuverture: getString(p, 'horaireOuverture'),
      horaireFermeture: getString(p, 'horaireFermeture'),
      type: getString(p, 'type'),
      tousLesAns: get(p, 'tousLesAns') === true
    }));
  });
  
  const [saving, setSaving] = useState(false);

  // Add communication
  const addCommunication = () => {
    setCommunications([...communications, { typeId: 201, typeLabel: 'Téléphone', value: '' }]);
  };

  // Remove communication
  const removeCommunication = (index: number) => {
    setCommunications(communications.filter((_, i) => i !== index));
  };

  // Update communication
  const updateCommunicationType = (index: number, typeId: number) => {
    const updated = [...communications];
    const type = COMMUNICATION_TYPES.find(t => t.id === typeId);
    updated[index] = { 
      ...updated[index], 
      typeId: typeId,
      typeLabel: type?.label || ''
    };
    setCommunications(updated);
  };

  const updateCommunicationValue = (index: number, value: string) => {
    const updated = [...communications];
    updated[index] = { ...updated[index], value };
    setCommunications(updated);
  };

  // Add periode
  const addPeriode = () => {
    setPeriodesOuverture([...periodesOuverture, { dateDebut: '', dateFin: '', horaireOuverture: '', horaireFermeture: '' }]);
  };

  // Remove periode
  const removePeriode = (index: number) => {
    setPeriodesOuverture(periodesOuverture.filter((_, i) => i !== index));
  };

  // Update periode
  const updatePeriode = (index: number, field: keyof PeriodeOuverture, value: string | boolean) => {
    const updated = [...periodesOuverture];
    updated[index] = { ...updated[index], [field]: value };
    setPeriodesOuverture(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build changes array for history
      const changes: Array<{ field: string; label: string; old_value: string | null; new_value: string | null }> = [];
      
      let updatedData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
      
      // Check and update nom
      const oldNom = getString(data, 'nom.libelleFr');
      if (nom !== oldNom) {
        updatedData = setNested(updatedData, 'nom.libelleFr', nom);
        changes.push({ field: 'nom.libelleFr', label: 'Nom', old_value: oldNom, new_value: nom });
      }
      
      // Check and update descriptions
      const oldDescCourte = getString(data, 'presentation.descriptifCourt.libelleFr');
      if (descriptionCourte !== oldDescCourte) {
        updatedData = setNested(updatedData, 'presentation.descriptifCourt.libelleFr', descriptionCourte);
        changes.push({ field: 'presentation.descriptifCourt.libelleFr', label: 'Description courte', old_value: oldDescCourte, new_value: descriptionCourte });
      }
      
      const oldDescDetaillee = getString(data, 'presentation.descriptifDetaille.libelleFr');
      if (descriptionDetaillee !== oldDescDetaillee) {
        updatedData = setNested(updatedData, 'presentation.descriptifDetaille.libelleFr', descriptionDetaillee);
        changes.push({ field: 'presentation.descriptifDetaille.libelleFr', label: 'Description détaillée', old_value: oldDescDetaillee, new_value: descriptionDetaillee });
      }
      
      // Check and update adresse
      const oldAdresse1 = getString(data, 'localisation.adresse.adresse1');
      if (adresse1 !== oldAdresse1) {
        updatedData = setNested(updatedData, 'localisation.adresse.adresse1', adresse1);
        changes.push({ field: 'localisation.adresse.adresse1', label: 'Adresse', old_value: oldAdresse1, new_value: adresse1 });
      }
      
      const oldAdresse2 = getString(data, 'localisation.adresse.adresse2');
      if (adresse2 !== oldAdresse2) {
        updatedData = setNested(updatedData, 'localisation.adresse.adresse2', adresse2);
        changes.push({ field: 'localisation.adresse.adresse2', label: 'Complément adresse', old_value: oldAdresse2, new_value: adresse2 });
      }
      
      const oldCP = getString(data, 'localisation.adresse.codePostal');
      if (codePostal !== oldCP) {
        updatedData = setNested(updatedData, 'localisation.adresse.codePostal', codePostal);
        changes.push({ field: 'localisation.adresse.codePostal', label: 'Code postal', old_value: oldCP, new_value: codePostal });
      }
      
      const oldCommune = getString(data, 'localisation.adresse.commune.nom');
      if (commune !== oldCommune) {
        updatedData = setNested(updatedData, 'localisation.adresse.commune.nom', commune);
        changes.push({ field: 'localisation.adresse.commune.nom', label: 'Commune', old_value: oldCommune, new_value: commune });
      }
      
      // Update moyensCommunication
      const newMoyens = communications.filter(c => c.value).map(c => ({
        type: { id: c.typeId, libelleFr: c.typeLabel },
        coordonnees: { fr: c.value }
      }));
      
      const oldMoyens = get(data, 'informations.moyensCommunication', []);
      if (JSON.stringify(newMoyens) !== JSON.stringify(oldMoyens)) {
        if (!updatedData.informations) {
          updatedData.informations = {};
        }
        (updatedData.informations as Record<string, unknown>).moyensCommunication = newMoyens;
        changes.push({ 
          field: 'informations.moyensCommunication', 
          label: 'Moyens de communication', 
          old_value: JSON.stringify(oldMoyens), 
          new_value: JSON.stringify(newMoyens) 
        });
      }
      
      // Update horaires - période en clair
      const oldPeriodeEnClair = getString(data, 'ouverture.periodeEnClair.libelleFr');
      if (periodeEnClair !== oldPeriodeEnClair) {
        updatedData = setNested(updatedData, 'ouverture.periodeEnClair.libelleFr', periodeEnClair);
        changes.push({ field: 'ouverture.periodeEnClair.libelleFr', label: 'Horaires (texte)', old_value: oldPeriodeEnClair, new_value: periodeEnClair });
      }
      
      // Update périodes d'ouverture
      const newPeriodes = periodesOuverture.filter(p => p.dateDebut || p.dateFin || p.horaireOuverture || p.horaireFermeture);
      const oldPeriodes = get(data, 'ouverture.periodesOuvertures', []);
      if (JSON.stringify(newPeriodes) !== JSON.stringify(oldPeriodes)) {
        if (!updatedData.ouverture) {
          updatedData.ouverture = {};
        }
        (updatedData.ouverture as Record<string, unknown>).periodesOuvertures = newPeriodes;
        changes.push({ 
          field: 'ouverture.periodesOuvertures', 
          label: 'Périodes d\'ouverture', 
          old_value: JSON.stringify(oldPeriodes), 
          new_value: JSON.stringify(newPeriodes) 
        });
      }
      
      if (changes.length === 0) {
        toast({
          title: "Aucune modification",
          description: "Aucun champ n'a été modifié",
        });
        onCancel();
        return;
      }
      
      // Update fiche in database
      const { error } = await supabase
        .from('fiches_data')
        .update({ 
          data: updatedData as Json,
          synced_to_sheets: false
        })
        .eq('id', fiche.id);
      
      if (error) throw error;
      
      // Get current user for history logging
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userData?.user?.id)
        .single();
      
      const actorName = profileData?.first_name && profileData?.last_name 
        ? `${profileData.first_name} ${profileData.last_name}`
        : userData?.user?.email || 'Admin';
      
      // Log to history
      await supabase.functions.invoke('log-fiche-history', {
        body: {
          fiche_id: fiche.fiche_id,
          fiche_uuid: fiche.id,
          action_type: 'manual_edit',
          actor_type: 'admin',
          actor_id: userData?.user?.id,
          actor_name: actorName,
          changes: changes
        }
      });
      
      toast({
        title: "Fiche modifiée",
        description: `${changes.length} champ(s) mis à jour`,
      });
      
      onSave();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="horaires">Horaires</TabsTrigger>
        </TabsList>

        {/* Onglet Général */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom de la fiche"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descriptionCourte">Description courte</Label>
            <Textarea
              id="descriptionCourte"
              value={descriptionCourte}
              onChange={(e) => setDescriptionCourte(e.target.value)}
              placeholder="Description courte"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descriptionDetaillee">Description détaillée</Label>
            <Textarea
              id="descriptionDetaillee"
              value={descriptionDetaillee}
              onChange={(e) => setDescriptionDetaillee(e.target.value)}
              placeholder="Description détaillée"
              rows={5}
            />
          </div>
          
          <Separator />
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Localisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse1">Adresse</Label>
                <Input
                  id="adresse1"
                  value={adresse1}
                  onChange={(e) => setAdresse1(e.target.value)}
                  placeholder="Adresse"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adresse2">Complément d'adresse</Label>
                <Input
                  id="adresse2"
                  value={adresse2}
                  onChange={(e) => setAdresse2(e.target.value)}
                  placeholder="Complément d'adresse"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input
                    id="codePostal"
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    placeholder="00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Input
                    id="commune"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Commune"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Contact */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Moyens de communication</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addCommunication}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {communications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun moyen de communication. Cliquez sur "Ajouter" pour en créer un.
                </p>
              ) : (
                communications.map((comm, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select 
                      value={comm.typeId.toString()} 
                      onValueChange={(value) => updateCommunicationType(index, parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMUNICATION_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={comm.value}
                      onChange={(e) => updateCommunicationValue(index, e.target.value)}
                      placeholder="Valeur"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeCommunication(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Horaires */}
        <TabsContent value="horaires" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="periodeEnClair">Horaires (texte libre)</Label>
            <Textarea
              id="periodeEnClair"
              value={periodeEnClair}
              onChange={(e) => setPeriodeEnClair(e.target.value)}
              placeholder="Ex: Ouvert tous les jours de 9h à 18h..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Ce texte sera affiché tel quel sur la fiche.
            </p>
          </div>
          
          <Separator />
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Périodes d'ouverture</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addPeriode}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {periodesOuverture.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune période d'ouverture définie.
                </p>
              ) : (
                periodesOuverture.map((periode, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Période {index + 1}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removePeriode(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Date début</Label>
                          <Input
                            type="date"
                            value={periode.dateDebut || ''}
                            onChange={(e) => updatePeriode(index, 'dateDebut', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Date fin</Label>
                          <Input
                            type="date"
                            value={periode.dateFin || ''}
                            onChange={(e) => updatePeriode(index, 'dateFin', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Heure ouverture</Label>
                          <Input
                            type="time"
                            value={periode.horaireOuverture || ''}
                            onChange={(e) => updatePeriode(index, 'horaireOuverture', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Heure fermeture</Label>
                          <Input
                            type="time"
                            value={periode.horaireFermeture || ''}
                            onChange={(e) => updatePeriode(index, 'horaireFermeture', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
