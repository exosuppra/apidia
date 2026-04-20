import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Trash2, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Benevole, Santonnier, PlanningAssignment } from "@/pages/admin/PlanningSantons";
import { exportPlanningExcel } from "./ExportPlanningExcel";
import { exportPlanningPDF } from "./ExportPlanningPDF";
import { logUserAction } from "@/lib/logUserAction";

interface PlanningTabProps {
  benevoles: Benevole[];
  santonniers: Santonnier[];
  assignments: PlanningAssignment[];
  days: string[];
  editionId: string;
  editionTitle: string;
  year: number;
  onRefresh: () => void;
}

export default function PlanningTab({ benevoles, santonniers, assignments, days, editionId, editionTitle, year, onRefresh }: PlanningTabProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const SLOTS_PER_STAND = 2;

  const getAssignments = (day: string, santId: string): PlanningAssignment[] => {
    return assignments.filter((a) => a.jour === day && a.santonnier_id === santId);
  };

  const getBenevoleForAssignment = (a: PlanningAssignment): Benevole | null => {
    return benevoles.find((b) => b.id === a.benevole_id) || null;
  };

  const handleAssign = async (day: string, santId: string, slotIndex: number, benId: string) => {
    const existing = getAssignments(day, santId);
    // Remove the assignment at this slot index if it exists
    if (existing[slotIndex]) {
      await supabase.from("santons_planning").delete().eq("id", existing[slotIndex].id);
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

  const handleRemoveSlot = async (assignmentId: string) => {
    await supabase.from("santons_planning").delete().eq("id", assignmentId);
    onRefresh();
  };

  const handleClearCell = async (day: string, santId: string) => {
    const existing = getAssignments(day, santId);
    for (const a of existing) {
      await supabase.from("santons_planning").delete().eq("id", a.id);
    }
    onRefresh();
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

      const SLOTS_PER_STAND = 2;

      // Helper: check if benevole name matches a text (partial, case-insensitive)
      const nameMatches = (ben: Benevole, text: string | null): boolean => {
        if (!text) return false;
        const fullName = `${ben.prenom || ""} ${ben.nom}`.toLowerCase();
        return text.toLowerCase().split(/[;,]/).some((part) => {
          const t = part.trim();
          return t && fullName.includes(t);
        });
      };

      // Step 1: Pre-assign volunteers to a "home stand" for consistency
      // Score each (volunteer, stand) pair globally
      const standScores: { benId: string; santId: string; score: number }[] = [];

      for (const ben of benevoles) {
        for (const sant of santonniers) {
          // Skip if excluded
          if (nameMatches(ben, sant.benevole_non_souhaite)) continue;

          let score = 0;
          // Preferred by santonnier
          if (nameMatches(ben, sant.benevole_souhaite)) score += 100;
          // Benevole wants this stand
          if (ben.stand_souhaite && sant.nom_stand.toLowerCase().includes(ben.stand_souhaite.toLowerCase())) score += 50;
          // Count available days for this stand (more availability = better fit)
          const availDays = days.filter((d) => ben.disponibilites[d] === true).length;
          score += availDays;

          standScores.push({ benId: ben.id, santId: sant.id, score });
        }
      }

      // Sort by score descending
      standScores.sort((a, b) => b.score - a.score);

      // Assign each volunteer a home stand (max SLOTS_PER_STAND volunteers per stand)
      const homeStand: Record<string, string> = {}; // benId -> santId
      const standVolunteers: Record<string, string[]> = {}; // santId -> benId[]
      santonniers.forEach((s) => (standVolunteers[s.id] = []));

      // Also try to place companions together
      const companionPairs: { ben1: string; ben2: string }[] = [];
      for (const ben of benevoles) {
        if (ben.souhaite_etre_avec) {
          const companion = benevoles.find((b) => nameMatches(b, ben.souhaite_etre_avec));
          if (companion && !companionPairs.some((p) =>
            (p.ben1 === ben.id && p.ben2 === companion.id) ||
            (p.ben1 === companion.id && p.ben2 === ben.id)
          )) {
            companionPairs.push({ ben1: ben.id, ben2: companion.id });
          }
        }
      }

      for (const entry of standScores) {
        if (homeStand[entry.benId]) continue; // already assigned
        if (standVolunteers[entry.santId].length >= SLOTS_PER_STAND) continue; // stand full

        homeStand[entry.benId] = entry.santId;
        standVolunteers[entry.santId].push(entry.benId);

        // If this volunteer has a companion, try to place them on the same stand
        const pair = companionPairs.find((p) => p.ben1 === entry.benId || p.ben2 === entry.benId);
        if (pair) {
          const companionId = pair.ben1 === entry.benId ? pair.ben2 : pair.ben1;
          if (!homeStand[companionId] && standVolunteers[entry.santId].length < SLOTS_PER_STAND) {
            // Check not excluded
            const sant = santonniers.find((s) => s.id === entry.santId);
            const comp = benevoles.find((b) => b.id === companionId);
            if (sant && comp && !nameMatches(comp, sant.benevole_non_souhaite)) {
              homeStand[companionId] = entry.santId;
              standVolunteers[entry.santId].push(companionId);
            }
          }
        }
      }

      // Step 2: Generate daily assignments based on home stands + availability
      // TWO-PASS approach: first assign all home-stand volunteers, then fill gaps with fallbacks
      const newAssignments: { edition_id: string; jour: string; santonnier_id: string; benevole_id: string }[] = [];

      // Track daily assignment counts per volunteer for equity
      const benDayCounts: Record<string, number> = {};
      benevoles.forEach((b) => (benDayCounts[b.id] = 0));

      for (const day of days) {
        // Track who is assigned this day (per stand)
        const dayStandAssigned: Record<string, string[]> = {};
        santonniers.forEach((s) => (dayStandAssigned[s.id] = []));
        const assignedThisDay = new Set<string>();

        // PASS 1: Assign home-stand volunteers to their home stand FIRST (priority)
        for (const sant of santonniers) {
          const homeVols = standVolunteers[sant.id] || [];
          for (const benId of homeVols) {
            if (dayStandAssigned[sant.id].length >= SLOTS_PER_STAND) break;
            if (assignedThisDay.has(benId)) continue;
            const ben = benevoles.find((b) => b.id === benId);
            if (ben && ben.disponibilites[day] === true) {
              dayStandAssigned[sant.id].push(benId);
              assignedThisDay.add(benId);
            }
          }
        }

        // PASS 2: Fill remaining empty slots with fallback volunteers
        for (const sant of santonniers) {
          if (dayStandAssigned[sant.id].length >= SLOTS_PER_STAND) continue;

          const candidates = benevoles
            .filter((b) =>
              b.disponibilites[day] === true &&
              !assignedThisDay.has(b.id) &&
              !nameMatches(b, sant.benevole_non_souhaite)
            )
            .sort((a, b) => {
              // Prefer volunteers without home stand, then fewest days
              const aNoHome = !homeStand[a.id] ? -5 : 0;
              const bNoHome = !homeStand[b.id] ? -5 : 0;
              return (benDayCounts[a.id] + aNoHome) - (benDayCounts[b.id] + bNoHome);
            });

          for (const c of candidates) {
            if (dayStandAssigned[sant.id].length >= SLOTS_PER_STAND) break;
            dayStandAssigned[sant.id].push(c.id);
            assignedThisDay.add(c.id);
          }
        }

        // Record all assignments for this day
        for (const sant of santonniers) {
          for (const benId of dayStandAssigned[sant.id]) {
            newAssignments.push({
              edition_id: editionId,
              jour: day,
              santonnier_id: sant.id,
              benevole_id: benId,
            });
            benDayCounts[benId]++;
          }
        }
      }

      // Insert in batches
      if (newAssignments.length > 0) {
        for (let i = 0; i < newAssignments.length; i += 50) {
          await supabase.from("santons_planning").insert(newAssignments.slice(i, i + 50));
        }
      }

      logUserAction("santons_generate_planning", { edition_id: editionId, assignments: newAssignments.length });
      toast({ title: "Planning généré", description: `${newAssignments.length} affectations créées (2 bénévoles/stand/jour).` });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleClearPlanning = async () => {
    if (!confirm("Supprimer toutes les affectations du planning ?")) return;
    await supabase.from("santons_planning").delete().eq("edition_id", editionId);
    logUserAction("santons_clear_planning", { edition_id: editionId });
    onRefresh();
    toast({ title: "Planning vidé" });
  };

  const handleExportExcel = () => {
    exportPlanningExcel(benevoles, santonniers, assignments, days, year);
    logUserAction("santons_export_excel", { edition_id: editionId });
  };

  const handleExportPDF = () => {
    exportPlanningPDF(benevoles, santonniers, assignments, days, editionTitle, year);
    logUserAction("santons_export_pdf", { edition_id: editionId });
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
          {assignments.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Export Excel
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-1" /> Export PDF
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleClearPlanning}>
            <Trash2 className="w-4 h-4 mr-1" /> Vider
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Générer automatiquement
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
                      const cellAssignments = getAssignments(d, sant.id);
                      const slots = Array.from({ length: SLOTS_PER_STAND }, (_, i) => {
                        const assignment = cellAssignments[i];
                        const assigned = assignment ? getBenevoleForAssignment(assignment) : null;
                        const violation = assigned ? isConstraintViolation(d, sant.id, assigned.id) : null;
                        return { assignment, assigned, violation, slotIndex: i };
                      });

                      return (
                        <td key={d} className="p-1 text-center">
                          <div className="flex flex-col gap-1">
                            {slots.map(({ assignment, assigned, violation, slotIndex }) => (
                              <div key={slotIndex} className="relative">
                                <Select
                                  value={assigned?.id || "none"}
                                  onValueChange={(val) => handleAssign(d, sant.id, slotIndex, val === "none" ? "" : val)}
                                >
                                  <SelectTrigger className={`h-7 text-xs ${violation ? "border-destructive bg-destructive/10" : assigned ? "border-primary/30 bg-primary/5" : ""}`}>
                                    <SelectValue placeholder="—">
                                      {assigned ? `${assigned.prenom || ""} ${assigned.nom}`.trim() : "—"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— Aucun —</SelectItem>
                                    {benevoles
                                      .filter((b) => {
                                        // Must be available this day
                                        if (!b.disponibilites[d]) return false;
                                        // Allow if already in this exact slot (current selection)
                                        if (assigned?.id === b.id) return true;
                                        // Exclude if already in the other slot of this cell
                                        if (cellAssignments.some((ca, ci) => ci !== slotIndex && ca.benevole_id === b.id)) return false;
                                        // Exclude if already assigned to another stand this day
                                        if (assignments.some((a) => a.jour === d && a.santonnier_id !== sant.id && a.benevole_id === b.id)) return false;
                                        return true;
                                      })
                                      .map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                          {b.prenom || ""} {b.nom} ({benevoleCounts[b.id] || 0}j)
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {violation && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" title={violation} />
                                )}
                              </div>
                            ))}
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
