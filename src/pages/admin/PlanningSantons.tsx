import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import BenevolesTab from "@/components/santons/BenevolesTab";
import SantonniersTab from "@/components/santons/SantonniersTab";
import PlanningTab from "@/components/santons/PlanningTab";
import ImportExcelDialog from "@/components/santons/ImportExcelDialog";
import EditionSelector from "@/components/santons/EditionSelector";
import { Upload } from "lucide-react";

export interface SantonsEdition {
  id: string;
  title: string;
  year: number;
  start_date: string;
  end_date: string;
}

export interface Benevole {
  id: string;
  civilite: string | null;
  prenom: string | null;
  nom: string;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  stand_souhaite: string | null;
  souhaite_etre_avec: string | null;
  disponibilites: Record<string, boolean>;
}

export interface Santonnier {
  id: string;
  nom_stand: string;
  prenom: string | null;
  nom: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  presence_info: string | null;
  benevole_souhaite: string | null;
  benevole_non_souhaite: string | null;
}

export interface PlanningAssignment {
  id: string;
  jour: string;
  santonnier_id: string;
  benevole_id: string;
}

export default function PlanningSantons() {
  const { toast } = useToast();
  const [editions, setEditions] = useState<SantonsEdition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<SantonsEdition | null>(null);
  const [benevoles, setBenevoles] = useState<Benevole[]>([]);
  const [santonniers, setSantonniers] = useState<Santonnier[]>([]);
  const [assignments, setAssignments] = useState<PlanningAssignment[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (selectedEdition) {
      fetchData(selectedEdition.id);
    }
  }, [selectedEdition]);

  const fetchEditions = async () => {
    const { data } = await supabase
      .from("santons_editions")
      .select("*")
      .order("year", { ascending: false });
    const eds = (data || []) as SantonsEdition[];
    setEditions(eds);
    if (eds.length > 0) setSelectedEdition(eds[0]);
    setLoading(false);
  };

  const fetchData = async (editionId: string) => {
    setLoading(true);
    // Fetch benevoles
    const { data: benData } = await supabase
      .from("santons_benevoles")
      .select("*")
      .eq("edition_id", editionId)
      .order("nom");

    // Fetch disponibilites
    const benevoleIds = (benData || []).map((b: any) => b.id);
    let dispoMap: Record<string, Record<string, boolean>> = {};
    if (benevoleIds.length > 0) {
      const { data: dispoData } = await supabase
        .from("santons_disponibilites")
        .select("*")
        .in("benevole_id", benevoleIds);
      (dispoData || []).forEach((d: any) => {
        if (!dispoMap[d.benevole_id]) dispoMap[d.benevole_id] = {};
        dispoMap[d.benevole_id][d.jour] = d.disponible;
      });
    }

    setBenevoles(
      (benData || []).map((b: any) => ({
        ...b,
        disponibilites: dispoMap[b.id] || {},
      }))
    );

    // Fetch santonniers + preferences
    const { data: santData } = await supabase
      .from("santons_santonniers")
      .select("*")
      .eq("edition_id", editionId)
      .order("nom_stand");

    const santIds = (santData || []).map((s: any) => s.id);
    let prefMap: Record<string, { benevole_souhaite: string | null; benevole_non_souhaite: string | null }> = {};
    if (santIds.length > 0) {
      const { data: prefData } = await supabase
        .from("santons_preferences")
        .select("*")
        .in("santonnier_id", santIds);
      (prefData || []).forEach((p: any) => {
        prefMap[p.santonnier_id] = {
          benevole_souhaite: p.benevole_souhaite,
          benevole_non_souhaite: p.benevole_non_souhaite,
        };
      });
    }

    setSantonniers(
      (santData || []).map((s: any) => ({
        ...s,
        benevole_souhaite: prefMap[s.id]?.benevole_souhaite || null,
        benevole_non_souhaite: prefMap[s.id]?.benevole_non_souhaite || null,
      }))
    );

    // Fetch planning assignments
    const { data: planData } = await supabase
      .from("santons_planning")
      .select("*")
      .eq("edition_id", editionId);
    setAssignments((planData || []) as PlanningAssignment[]);

    setLoading(false);
  };

  const getEditionDays = (): string[] => {
    if (!selectedEdition) return [];
    const days: string[] = [];
    const start = new Date(selectedEdition.start_date);
    const end = new Date(selectedEdition.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  };

  return (
    <>
      <Seo title="Planning Foire aux Santons" description="Gestion du planning bénévoles pour la Foire aux Santons" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planning Foire aux Santons</h1>
            <p className="text-sm text-muted-foreground">Gestion des bénévoles, santonniers et planning</p>
          </div>
          <div className="flex items-center gap-3">
            <EditionSelector
              editions={editions}
              selected={selectedEdition}
              onSelect={setSelectedEdition}
              onRefresh={fetchEditions}
            />
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importer Excel
            </Button>
          </div>
        </div>

        {selectedEdition ? (
          <Tabs defaultValue="planning" className="w-full">
            <TabsList>
              <TabsTrigger value="planning">Planning</TabsTrigger>
              <TabsTrigger value="benevoles">Bénévoles ({benevoles.length})</TabsTrigger>
              <TabsTrigger value="santonniers">Santonniers ({santonniers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="benevoles">
              <BenevolesTab
                benevoles={benevoles}
                days={getEditionDays()}
                editionId={selectedEdition.id}
                onRefresh={() => fetchData(selectedEdition.id)}
              />
            </TabsContent>
            <TabsContent value="santonniers">
              <SantonniersTab
                santonniers={santonniers}
                editionId={selectedEdition.id}
                onRefresh={() => fetchData(selectedEdition.id)}
              />
            </TabsContent>
            <TabsContent value="planning">
              <PlanningTab
                benevoles={benevoles}
                santonniers={santonniers}
                assignments={assignments}
                days={getEditionDays()}
                editionId={selectedEdition.id}
                editionTitle={selectedEdition.title}
                year={selectedEdition.year}
                onRefresh={() => fetchData(selectedEdition.id)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {loading ? "Chargement…" : "Créez une édition pour commencer."}
          </div>
        )}
      </div>

      <ImportExcelDialog
        open={showImport}
        onOpenChange={setShowImport}
        edition={selectedEdition}
        onImported={() => selectedEdition && fetchData(selectedEdition.id)}
      />
    </>
  );
}
