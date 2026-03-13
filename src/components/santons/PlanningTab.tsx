import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Trash2, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Benevole, Santonnier, PlanningAssignment } from "@/pages/admin/PlanningSantons";

interface PlanningTabProps {
  benevoles: Benevole[];
  santonniers: Santonnier[];
  assignments: PlanningAssignment[];
  days: string[];
  editionId: string;
  onRefresh: () => void;
}

export default function PlanningTab({ benevoles, santonniers, assignments, days, editionId, onRefresh }: PlanningTabProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const getAssignment = (day: string, santId: string): Benevole | null => {
    const a = assignments.find((a) => a.jour === day && a.santonnier_id === santId);
    if (!a) return null;
    return benevoles.find((b) => b.id === a.benevole_id) || null;
  };

  const getAssignmentId = (day: string, santId: string): string | null => {
    return assignments.find((a) => a.jour === day && a.santonnier_id === santId)?.id || null;
  };

  const handleAssign = async (day: string, santId: string, benId: string) => {
    // Remove existing assignment for this cell
    const existing = assignments.find((a) => a.jour === day && a.santonnier_id === santId);
    if (existing) {
      await supabase.from("santons_planning").delete().eq("id", existing.id);
    }
    if (benId) {
      await supabase.from("santons_planning").insert({
        edition_id: editionId,
        jour: day,
        santonnier_id: santId,
        benevole_id: benId,
      });
    }
    onRefresh();
  };

  const handleRemove = async (day: string, santId: string) => {
    const id = getAssignmentId(day, santId);
    if (id) {
      await supabase.from("santons_planning").delete().eq("id", id);
      onRefresh();
    }
  };

  const handleGenerate = async () => {
    if (benevoles.length === 0 || santonniers.length === 0) {
      toast({ title: "Données manquantes", description: "Ajoutez des bénévoles et santonniers d'abord.", variant: "destructive" });
      return;
    }
    setGenerating(true);

    try {
      // Clear existing
      await supabase.from("santons_planning").delete().eq("edition_id", editionId);

      // Build assignment counts for equitable distribution
      const benCounts: Record<string, number> = {};
      benevoles.forEach((b) => (benCounts[b.id] = 0));

      // Track which benevole is assigned on which day
      const benAssignedDay: Record<string, Set<string>> = {};
      benevoles.forEach((b) => (benAssignedDay[b.id] = new Set()));

      const newAssignments: { edition_id: string; jour: string; santonnier_id: string; benevole_id: string }[] = [];

      // Helper: check if benevole name matches a text (partial, case-insensitive)
      const nameMatches = (ben: Benevole, text: string | null): boolean => {
        if (!text) return false;
        const fullName = `${ben.prenom || ""} ${ben.nom}`.toLowerCase();
        return text.toLowerCase().split(/[;,]/).some((part) => {
          const t = part.trim();
          return t && fullName.includes(t);
        });
      };

      // For each day, assign benevoles to santonniers
      for (const day of days) {
        // Get available benevoles for this day
        const availableBens = benevoles.filter(
          (b) => b.disponibilites[day] === true && !benAssignedDay[b.id].has(day)
        );

        // Score each (santonnier, benevole) pair
        for (const sant of santonniers) {
          // Skip if no available benevoles
          if (availableBens.length === 0) break;

          // Filter out non-souhaité
          const eligible = availableBens.filter(
            (b) => !nameMatches(b, sant.benevole_non_souhaite) && !benAssignedDay[b.id].has(day)
          );

          if (eligible.length === 0) continue;

          // Score benevoles: higher = better fit
          const scored = eligible.map((b) => {
            let score = 0;
            // Preferred by santonnier
            if (nameMatches(b, sant.benevole_souhaite)) score += 100;
            // Benevole wants this stand
            if (b.stand_souhaite && sant.nom_stand.toLowerCase().includes(b.stand_souhaite.toLowerCase())) score += 50;
            // Equitable: fewer days assigned = higher priority
            score -= benCounts[b.id] * 10;
            // Check if companion is already assigned to this stand this day
            if (b.souhaite_etre_avec) {
              const companionAssigned = newAssignments.some(
                (a) => a.jour === day && a.santonnier_id === sant.id &&
                  benevoles.some((cb) => cb.id === a.benevole_id && nameMatches(cb, b.souhaite_etre_avec))
              );
              if (companionAssigned) score += 30;
            }
            return { ben: b, score };
          });

          // Pick best
          scored.sort((a, b) => b.score - a.score);
          const best = scored[0].ben;

          newAssignments.push({
            edition_id: editionId,
            jour: day,
            santonnier_id: sant.id,
            benevole_id: best.id,
          });
          benCounts[best.id]++;
          benAssignedDay[best.id].add(day);
        }
      }

      // Second pass: try to place companions together
      // For benevoles with souhaite_etre_avec, swap if possible to be on the same stand
      for (const a of newAssignments) {
        const ben = benevoles.find((b) => b.id === a.benevole_id);
        if (!ben?.souhaite_etre_avec) continue;

        // Find if companion is assigned this day to a different stand
        const companionAssignment = newAssignments.find(
          (ca) => ca.jour === a.jour && ca.santonnier_id !== a.santonnier_id &&
            benevoles.some((cb) => cb.id === ca.benevole_id && nameMatches(cb, ben.souhaite_etre_avec))
        );

        if (companionAssignment) {
          // Check if we can swap companion to this stand (no exclusion)
          const companion = benevoles.find((b) => b.id === companionAssignment.benevole_id);
          const targetSant = santonniers.find((s) => s.id === a.santonnier_id);
          if (companion && targetSant && !nameMatches(companion, targetSant.benevole_non_souhaite)) {
            // Find who is on this stand and swap
            companionAssignment.santonnier_id = a.santonnier_id;
          }
        }
      }

      // Insert in batches
      if (newAssignments.length > 0) {
        for (let i = 0; i < newAssignments.length; i += 50) {
          await supabase.from("santons_planning").insert(newAssignments.slice(i, i + 50));
        }
      }

      toast({ title: "Planning généré", description: `${newAssignments.length} affectations créées automatiquement.` });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleClearPlanning = async () => {
    if (!confirm("Supprimer toutes les affectations du planning ?")) return;
    await supabase.from("santons_planning").delete().eq("edition_id", editionId);
    onRefresh();
    toast({ title: "Planning vidé" });
  };

  const isConstraintViolation = (day: string, santId: string, benId: string): string | null => {
    const ben = benevoles.find((b) => b.id === benId);
    const sant = santonniers.find((s) => s.id === santId);
    if (!ben || !sant) return null;

    if (!ben.disponibilites[day]) return "Bénévole non disponible ce jour";
    if (sant.benevole_non_souhaite && ben.nom.toLowerCase().includes(sant.benevole_non_souhaite.toLowerCase())) {
      return `Non souhaité par ${sant.nom_stand}`;
    }
    return null;
  };

  const formatDay = (d: string) => {
    try {
      return format(new Date(d), "EEE dd/MM", { locale: fr });
    } catch {
      return d;
    }
  };

  // Count assignments per benevole
  const benevoleCounts: Record<string, number> = {};
  assignments.forEach((a) => {
    benevoleCounts[a.benevole_id] = (benevoleCounts[a.benevole_id] || 0) + 1;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Planning des affectations</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleClearPlanning}>
            <Trash2 className="w-4 h-4 mr-1" /> Vider
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Générer avec l'IA
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats rapides */}
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>{assignments.length} affectations</span>
          <span>•</span>
          <span>{Object.keys(benevoleCounts).length} bénévoles affectés</span>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b font-medium sticky left-0 bg-background z-10">Stand</th>
                  {days.map((d) => (
                    <th key={d} className="text-center p-2 border-b text-xs min-w-[120px]">
                      {formatDay(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {santonniers.map((sant) => (
                  <tr key={sant.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium whitespace-nowrap sticky left-0 bg-background z-10">
                      {sant.nom_stand}
                    </td>
                    {days.map((d) => {
                      const assigned = getAssignment(d, sant.id);
                      const violation = assigned ? isConstraintViolation(d, sant.id, assigned.id) : null;
                      return (
                        <td key={d} className="p-1 text-center">
                          <div className="relative">
                            <Select
                              value={assigned?.id || "none"}
                              onValueChange={(val) => handleAssign(d, sant.id, val === "none" ? "" : val)}
                            >
                              <SelectTrigger className={`h-8 text-xs ${violation ? "border-destructive bg-destructive/10" : assigned ? "border-primary/30 bg-primary/5" : ""}`}>
                                <SelectValue placeholder="—">
                                  {assigned ? `${assigned.prenom || ""} ${assigned.nom}`.trim() : "—"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Aucun —</SelectItem>
                                {benevoles
                                  .filter((b) => b.disponibilites[d])
                                  .map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                      {b.prenom || ""} {b.nom} ({benevoleCounts[b.id] || 0}j)
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {violation && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title={violation} />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Résumé par bénévole */}
        {assignments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Résumé par bénévole</h3>
            <div className="flex flex-wrap gap-2">
              {benevoles
                .filter((b) => benevoleCounts[b.id])
                .sort((a, b) => (benevoleCounts[b.id] || 0) - (benevoleCounts[a.id] || 0))
                .map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                    {b.prenom || ""} {b.nom}: <strong>{benevoleCounts[b.id]}j</strong>
                  </span>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
