import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, X } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

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

// Get communication value by type
const getCommunicationValue = (data: unknown, typeKeyword: string): string => {
  const moyens = get(data, 'informations.moyensCommunication', []) as Array<Record<string, unknown>>;
  if (!Array.isArray(moyens)) return '';
  
  const moyen = moyens.find(m => {
    const typeLib = getString(m, 'type.libelleFr', '').toLowerCase();
    return typeLib.includes(typeKeyword);
  });
  
  if (moyen) {
    const coordFr = getString(moyen, 'coordonnees.fr', '');
    const coordDirect = typeof moyen.coordonnees === 'string' ? moyen.coordonnees : '';
    return coordFr || coordDirect;
  }
  return '';
};

// Update or add communication value
const updateCommunication = (data: Record<string, unknown>, typeKeyword: string, typeName: string, typeId: number, newValue: string): Record<string, unknown> => {
  const result = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  
  if (!result.informations) {
    result.informations = {};
  }
  const informations = result.informations as Record<string, unknown>;
  
  if (!informations.moyensCommunication) {
    informations.moyensCommunication = [];
  }
  const moyens = informations.moyensCommunication as Array<Record<string, unknown>>;
  
  const existingIndex = moyens.findIndex(m => {
    const typeLib = getString(m, 'type.libelleFr', '').toLowerCase();
    return typeLib.includes(typeKeyword);
  });
  
  if (existingIndex >= 0) {
    if (newValue) {
      // Update existing
      if (typeof moyens[existingIndex].coordonnees === 'object') {
        (moyens[existingIndex].coordonnees as Record<string, string>).fr = newValue;
      } else {
        moyens[existingIndex].coordonnees = { fr: newValue };
      }
    } else {
      // Remove if empty
      moyens.splice(existingIndex, 1);
    }
  } else if (newValue) {
    // Add new
    moyens.push({
      type: { id: typeId, libelleFr: typeName },
      coordonnees: { fr: newValue }
    });
  }
  
  return result;
};

export function FicheEditForm({ fiche, onSave, onCancel }: FicheEditFormProps) {
  const { toast } = useToast();
  const data = fiche.data as Record<string, unknown>;
  
  // Form state
  const [nom, setNom] = useState(getString(data, 'nom.libelleFr'));
  const [descriptionCourte, setDescriptionCourte] = useState(getString(data, 'presentation.descriptifCourt.libelleFr'));
  const [adresse1, setAdresse1] = useState(getString(data, 'localisation.adresse.adresse1'));
  const [codePostal, setCodePostal] = useState(getString(data, 'localisation.adresse.codePostal'));
  const [telephone, setTelephone] = useState(getCommunicationValue(data, 'téléphone'));
  const [email, setEmail] = useState(getCommunicationValue(data, 'mel') || getCommunicationValue(data, 'mail'));
  const [siteWeb, setSiteWeb] = useState(getCommunicationValue(data, 'site web'));
  
  const [saving, setSaving] = useState(false);

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
      
      // Check and update description courte
      const oldDesc = getString(data, 'presentation.descriptifCourt.libelleFr');
      if (descriptionCourte !== oldDesc) {
        updatedData = setNested(updatedData, 'presentation.descriptifCourt.libelleFr', descriptionCourte);
        changes.push({ field: 'presentation.descriptifCourt.libelleFr', label: 'Description courte', old_value: oldDesc, new_value: descriptionCourte });
      }
      
      // Check and update adresse
      const oldAdresse = getString(data, 'localisation.adresse.adresse1');
      if (adresse1 !== oldAdresse) {
        updatedData = setNested(updatedData, 'localisation.adresse.adresse1', adresse1);
        changes.push({ field: 'localisation.adresse.adresse1', label: 'Adresse', old_value: oldAdresse, new_value: adresse1 });
      }
      
      // Check and update code postal
      const oldCP = getString(data, 'localisation.adresse.codePostal');
      if (codePostal !== oldCP) {
        updatedData = setNested(updatedData, 'localisation.adresse.codePostal', codePostal);
        changes.push({ field: 'localisation.adresse.codePostal', label: 'Code postal', old_value: oldCP, new_value: codePostal });
      }
      
      // Check and update telephone
      const oldTel = getCommunicationValue(data, 'téléphone');
      if (telephone !== oldTel) {
        updatedData = updateCommunication(updatedData, 'téléphone', 'Téléphone', 201, telephone);
        changes.push({ field: 'telephone', label: 'Téléphone', old_value: oldTel || null, new_value: telephone || null });
      }
      
      // Check and update email
      const oldEmail = getCommunicationValue(data, 'mel') || getCommunicationValue(data, 'mail');
      if (email !== oldEmail) {
        updatedData = updateCommunication(updatedData, 'mel', 'Mél', 204, email);
        changes.push({ field: 'email', label: 'Email', old_value: oldEmail || null, new_value: email || null });
      }
      
      // Check and update site web
      const oldSite = getCommunicationValue(data, 'site web');
      if (siteWeb !== oldSite) {
        updatedData = updateCommunication(updatedData, 'site web', 'Site web (URL)', 205, siteWeb);
        changes.push({ field: 'site_web', label: 'Site web', old_value: oldSite || null, new_value: siteWeb || null });
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
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input
            id="nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de la fiche"
          />
        </div>
        
        {/* Description courte */}
        <div className="space-y-2">
          <Label htmlFor="description">Description courte</Label>
          <Textarea
            id="description"
            value={descriptionCourte}
            onChange={(e) => setDescriptionCourte(e.target.value)}
            placeholder="Description courte"
            rows={3}
          />
        </div>
        
        {/* Adresse */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={adresse1}
              onChange={(e) => setAdresse1(e.target.value)}
              placeholder="Adresse"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input
              id="codePostal"
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              placeholder="00000"
            />
          </div>
        </div>
        
        {/* Contact */}
        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="00 00 00 00 00"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@exemple.fr"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="siteWeb">Site web</Label>
          <Input
            id="siteWeb"
            value={siteWeb}
            onChange={(e) => setSiteWeb(e.target.value)}
            placeholder="https://www.exemple.fr"
          />
        </div>
      </div>
      
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
