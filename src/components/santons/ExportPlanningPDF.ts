import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Benevole, Santonnier, PlanningAssignment } from "@/pages/admin/PlanningSantons";

function formatDay(d: string): string {
  try {
    return format(new Date(d), "EEEE dd MMMM", { locale: fr });
  } catch {
    return d;
  }
}

export function exportPlanningPDF(
  benevoles: Benevole[],
  santonniers: Santonnier[],
  assignments: PlanningAssignment[],
  days: string[],
  editionTitle: string,
  year: number
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Get benevoles who have at least one assignment, sorted by name
  const assignedBenevoles = benevoles
    .filter((b) => assignments.some((a) => a.benevole_id === b.id))
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));

  if (assignedBenevoles.length === 0) return;

  assignedBenevoles.forEach((ben, index) => {
    if (index > 0) doc.addPage();

    const fullName = `${ben.prenom || ""} ${ben.nom}`.trim();
    const benAssignments = assignments.filter((a) => a.benevole_id === ben.id);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Planning individuel", 14, 20);

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(fullName, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(editionTitle || `Foire aux Santons ${year}`, 14, 37);
    doc.setTextColor(0);

    // Build table data sorted by day
    const tableData = days
      .filter((day) => benAssignments.some((a) => a.jour === day))
      .map((day) => {
        const stands = benAssignments
          .filter((a) => a.jour === day)
          .map((a) => {
            const sant = santonniers.find((s) => s.id === a.santonnier_id);
            return sant?.nom_stand || "—";
          })
          .join(", ");
        return [formatDay(day), stands];
      });

    autoTable(doc, {
      startY: 43,
      head: [["Jour", "Stand affecté"]],
      body: tableData,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: "auto" },
      },
    });

    // Summary at bottom
    const totalDays = tableData.length;
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total : ${totalDays} jour${totalDays > 1 ? "s" : ""}`, 14, finalY + 10);
  });

  doc.save(`Plannings_Benevoles_${year}.pdf`);
}
