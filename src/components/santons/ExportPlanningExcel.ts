import XLSX from "xlsx-js-style";
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

const HEADER_FILL = { fgColor: { rgb: "3B82F6" } };
const HEADER_FONT = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 };
const HEADER_ALIGNMENT = { horizontal: "center" as const, vertical: "center" as const, wrapText: true };
const BORDER_STYLE = {
  top: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  bottom: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  left: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  right: { style: "thin" as const, color: { rgb: "D1D5DB" } },
};
const STAND_FONT = { bold: true, sz: 10 };
const CELL_FONT = { sz: 9 };
const EVEN_ROW_FILL = { fgColor: { rgb: "F3F4F6" } };
const ODD_ROW_FILL = { fgColor: { rgb: "FFFFFF" } };
const CELL_ALIGNMENT = { vertical: "center" as const, wrapText: true };
const STAND_ALIGNMENT = { vertical: "center" as const };

function applyStyle(ws: XLSX.WorkSheet, ref: string, style: any) {
  if (!ws[ref]) ws[ref] = { v: "", t: "s" };
  ws[ref].s = style;
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

  // Style header row
  for (let c = 0; c < header.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    applyStyle(ws, ref, {
      fill: HEADER_FILL,
      font: HEADER_FONT,
      alignment: HEADER_ALIGNMENT,
      border: BORDER_STYLE,
    });
  }

  // Style data rows
  for (let r = 0; r < rows.length; r++) {
    const fill = r % 2 === 0 ? EVEN_ROW_FILL : ODD_ROW_FILL;
    for (let c = 0; c < header.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c });
      if (c === 0) {
        applyStyle(ws, ref, {
          font: STAND_FONT,
          fill,
          alignment: STAND_ALIGNMENT,
          border: BORDER_STYLE,
        });
      } else {
        applyStyle(ws, ref, {
          font: CELL_FONT,
          fill,
          alignment: CELL_ALIGNMENT,
          border: BORDER_STYLE,
        });
      }
    }
  }

  // Column widths
  ws["!cols"] = [
    { wch: 28 },
    ...days.map(() => ({ wch: 20 })),
  ];

  // Row heights
  ws["!rows"] = [
    { hpt: 30 },
    ...rows.map(() => ({ hpt: 40 })),
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

  // Style summary header
  for (let c = 0; c < summaryHeader.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    applyStyle(ws2, ref, {
      fill: { fgColor: { rgb: "10B981" } },
      font: HEADER_FONT,
      alignment: HEADER_ALIGNMENT,
      border: BORDER_STYLE,
    });
  }

  // Style summary data rows
  for (let r = 0; r < summaryRows.length; r++) {
    const fill = r % 2 === 0 ? EVEN_ROW_FILL : ODD_ROW_FILL;
    for (let c = 0; c < summaryHeader.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c });
      const isCount = c === 2;
      applyStyle(ws2, ref, {
        font: isCount ? { bold: true, sz: 10 } : { sz: 10 },
        fill,
        alignment: { horizontal: isCount ? "center" as const : "left" as const, vertical: "center" as const, wrapText: true },
        border: BORDER_STYLE,
      });
    }
  }

  ws2["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 45 }];
  ws2["!rows"] = [{ hpt: 30 }, ...summaryRows.map(() => ({ hpt: 22 }))];

  XLSX.utils.book_append_sheet(wb, ws2, "Résumé bénévoles");

  XLSX.writeFile(wb, `Planning_Santons_${year}.xlsx`);
}
