import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Benevole, Santonnier, PlanningAssignment } from "@/pages/admin/PlanningSantons";

function formatDay(d: string): string {
  try {
    return format(new Date(d), "EEE dd/MM", { locale: fr });
  } catch {
    return d;
  }
}

export function exportPlanningExcel(
  benevoles: Benevole[],
  santonniers: Santonnier[],
  assignments: PlanningAssignment[],
  days: string[],
  year: number
) {
  const wb = XLSX.utils.book_new();

  // === Sheet 1: Planning grid ===
  const header = ["Stand", ...days.map(formatDay)];
  const rows: string[][] = [];

  for (const sant of santonniers) {
    const row = [sant.nom_stand];
    for (const day of days) {
      const dayAssignments = assignments.filter(
        (a) => a.jour === day && a.santonnier_id === sant.id
      );
      const names = dayAssignments
        .map((a) => {
          const ben = benevoles.find((b) => b.id === a.benevole_id);
          return ben ? `${ben.prenom || ""} ${ben.nom}`.trim() : "";
        })
        .filter(Boolean);
      row.push(names.join("\n"));
    }
    rows.push(row);
  }

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 25 },
    ...days.map(() => ({ wch: 22 })),
  ];

  // Row heights for multi-line cells
  ws["!rows"] = [
    { hpt: 20 },
    ...rows.map(() => ({ hpt: 35 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Planning");

  // === Sheet 2: Résumé bénévoles ===
  const benevoleCounts: Record<string, number> = {};
  assignments.forEach((a) => {
    benevoleCounts[a.benevole_id] = (benevoleCounts[a.benevole_id] || 0) + 1;
  });

  const summaryHeader = ["Bénévole", "Ville", "Nb jours affectés", "Stands"];
  const summaryRows: string[][] = benevoles
    .filter((b) => benevoleCounts[b.id])
    .sort((a, b) => (benevoleCounts[b.id] || 0) - (benevoleCounts[a.id] || 0))
    .map((b) => {
      const stands = [
        ...new Set(
          assignments
            .filter((a) => a.benevole_id === b.id)
            .map((a) => {
              const sant = santonniers.find((s) => s.id === a.santonnier_id);
              return sant?.nom_stand || "";
            })
            .filter(Boolean)
        ),
      ];
      return [
        `${b.prenom || ""} ${b.nom}`.trim(),
        b.ville || "",
        String(benevoleCounts[b.id] || 0),
        stands.join(", "),
      ];
    });

  const ws2 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
  ws2["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Résumé bénévoles");

  XLSX.writeFile(wb, `Planning_Santons_${year}.xlsx`);
}
