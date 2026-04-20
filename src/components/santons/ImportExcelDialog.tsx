import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";
import XLSX from "xlsx-js-style";
import type { SantonsEdition } from "@/pages/admin/PlanningSantons";
import { logUserAction } from "@/lib/logUserAction";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edition: SantonsEdition | null;
  onImported: () => void;
}

export default function ImportExcelDialog({ open, onOpenChange, edition, onImported }: ImportExcelDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ benevoles: number; santonniers: number } | null>(null);
  const [fileData, setFileData] = useState<XLSX.WorkBook | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      setFileData(wb);

      // Count rows
      const benSheet = wb.Sheets[wb.SheetNames[0]];
      const santSheet = wb.Sheets[wb.SheetNames[1]];
      const benRows = XLSX.utils.sheet_to_json(benSheet);
      const santRows = santSheet ? XLSX.utils.sheet_to_json(santSheet) : [];
      setPreview({ benevoles: benRows.length, santonniers: santRows.length });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!fileData || !edition) return;
    setImporting(true);

    try {
      // Parse benevoles (first sheet)
      const benSheet = fileData.Sheets[fileData.SheetNames[0]];
      const benRows: any[] = XLSX.utils.sheet_to_json(benSheet, { defval: "" });

      // Parse dates from header - look for date columns
      const headers = XLSX.utils.sheet_to_json(benSheet, { header: 1 })[0] as any[];
      const dateColumns: { colIndex: number; date: string }[] = [];

      // Get edition days
      const edDays: string[] = [];
      const start = new Date(edition.start_date);
      const end = new Date(edition.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        edDays.push(d.toISOString().split("T")[0]);
      }

      // Try to match header columns to dates
      headers.forEach((h, i) => {
        if (typeof h === "number") {
          // Excel serial date
          const date = XLSX.SSF.parse_date_code(h);
          if (date) {
            const iso = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
            dateColumns.push({ colIndex: i, date: iso });
          }
        } else if (typeof h === "string") {
          // Try to match date-like strings
          const match = h.match(/(\d{1,2})[\/\-](\d{1,2})/);
          if (match) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]);
            const year = edition.year;
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            if (edDays.includes(iso)) {
              dateColumns.push({ colIndex: i, date: iso });
            }
          }
        }
      });

      // Insert benevoles
      for (const row of benRows) {
        const keys = Object.keys(row);
        const civilite = row[keys[0]] || "";
        const nom = row[keys[1]] || "";
        const prenom = row[keys[2]] || "";
        const ville = row[keys[3]] || "";
        const tel = row[keys[4]] || "";
        const email = row[keys[5]] || "";
        const standSouhaite = row[keys[6]] || "";
        const souhaiteAvec = row[keys[7]] || "";

        if (!nom) continue;

        const { data: newBen } = await supabase
          .from("santons_benevoles")
          .insert({
            edition_id: edition.id,
            civilite: civilite || null,
            prenom: prenom || null,
            nom: String(nom),
            ville: ville || null,
            telephone: tel ? String(tel) : null,
            email: email || null,
            stand_souhaite: standSouhaite || null,
            souhaite_etre_avec: souhaiteAvec || null,
          })
          .select("id")
          .single();

        if (newBen && dateColumns.length > 0) {
          const dispoRows = dateColumns
            .map((dc) => {
              const val = row[keys[dc.colIndex]] || row[headers[dc.colIndex]];
              const isDisponible =
                val === "oui" || val === "Oui" || val === "OUI" || val === "x" || val === "X" || val === true || val === 1;
              return {
                benevole_id: newBen.id,
                jour: dc.date,
                disponible: isDisponible,
              };
            })
            .filter((d) => edDays.includes(d.jour));

          if (dispoRows.length > 0) {
            await supabase.from("santons_disponibilites").insert(dispoRows);
          }
        }
      }

      // Parse santonniers (second sheet)
      if (fileData.SheetNames.length > 1) {
        const santSheet = fileData.Sheets[fileData.SheetNames[1]];
        const santRows: any[] = XLSX.utils.sheet_to_json(santSheet, { defval: "" });

        for (const row of santRows) {
          const keys = Object.keys(row);
          const nomStand = row[keys[0]] || "";
          if (!nomStand) continue;

          const { data: newSant } = await supabase
            .from("santons_santonniers")
            .insert({
              edition_id: edition.id,
              nom_stand: String(nomStand),
              prenom: row[keys[1]] || null,
              nom: row[keys[2]] || null,
              ville: row[keys[3]] || null,
              telephone: row[keys[4]] ? String(row[keys[4]]) : null,
              email: row[keys[5]] || null,
              site_web: row[keys[6]] || null,
              presence_info: row[keys[7]] || null,
            })
            .select("id")
            .single();

          if (newSant) {
            const benSouhaite = row[keys[8]] || row[keys[9]] || "";
            const benNonSouhaite = row[keys[9]] || row[keys[10]] || "";
            await supabase.from("santons_preferences").insert({
              santonnier_id: newSant.id,
              benevole_souhaite: benSouhaite || null,
              benevole_non_souhaite: benNonSouhaite || null,
            });
          }
        }
      }

      logUserAction("santons_import_excel", { edition_id: edition.id, edition_title: edition.title });
      toast({ title: "Import réussi", description: "Les données ont été importées." });
      onImported();
      onOpenChange(false);
      setPreview(null);
      setFileData(null);
    } catch (e: any) {
      toast({ title: "Erreur d'import", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer un fichier Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!edition && (
            <p className="text-sm text-destructive">Veuillez d'abord créer ou sélectionner une édition.</p>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Le fichier doit contenir 2 onglets : Bénévoles (1er) et Santonniers (2e).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm"
              onChange={handleFile}
              disabled={!edition}
            />
          </div>

          {preview && (
            <div className="p-3 bg-muted rounded text-sm">
              <p>📋 Aperçu : <strong>{preview.benevoles}</strong> bénévoles, <strong>{preview.santonniers}</strong> santonniers</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={!fileData || !edition || importing}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Import en cours…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" /> Importer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
