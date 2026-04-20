import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { Task, Tag } from "@/types/planning";
import { logUserAction } from "@/lib/logUserAction";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  tags: Tag[];
}

type ExportFormat = "csv" | "json" | "docx";

export function ExportDialog({ open, onOpenChange, tasks, tags }: ExportDialogProps) {
  const [titleFilter, setTitleFilter] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [includeDescription, setIncludeDescription] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [includePriority, setIncludePriority] = useState(true);

  // Filtered tasks based on criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by title
      if (titleFilter) {
        if (!task.title.toLowerCase().includes(titleFilter.toLowerCase())) {
          return false;
        }
      }

      // Filter by tags
      if (selectedTagIds.length > 0) {
        const taskTagIds = task.tags?.map((t) => t.id) || [];
        const hasMatchingTag = selectedTagIds.some((tagId) =>
          taskTagIds.includes(tagId)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, titleFilter, selectedTagIds]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setTitleFilter("");
    setSelectedTagIds([]);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo":
        return "À faire";
      case "in_progress":
        return "En cours";
      case "done":
        return "Terminé";
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "low":
        return "Basse";
      case "medium":
        return "Moyenne";
      case "high":
        return "Haute";
      default:
        return priority;
    }
  };

  const exportToCSV = () => {
    const headers = ["Titre", "Date d'échéance"];
    if (includeDescription) headers.push("Description");
    if (includeTags) headers.push("Tags");
    if (includeStatus) headers.push("Statut");
    if (includePriority) headers.push("Priorité");

    const rows = filteredTasks.map((task) => {
      const row = [
        `"${task.title.replace(/"/g, '""')}"`,
        task.due_date
          ? format(new Date(task.due_date), "dd/MM/yyyy", { locale: fr })
          : "",
      ];

      if (includeDescription) {
        row.push(
          `"${(task.description || "").replace(/"/g, '""').replace(/\n/g, " ")}"`
        );
      }
      if (includeTags) {
        row.push(`"${task.tags?.map((t) => t.name).join(", ") || ""}"`);
      }
      if (includeStatus) {
        row.push(getStatusLabel(task.status));
      }
      if (includePriority) {
        row.push(getPriorityLabel(task.priority));
      }

      return row.join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\n");
    downloadFile(csvContent, "planning-export.csv", "text/csv;charset=utf-8;");
  };

  const exportToJSON = () => {
    const data = filteredTasks.map((task) => {
      const item: any = {
        titre: task.title,
        date_echeance: task.due_date
          ? format(new Date(task.due_date), "yyyy-MM-dd")
          : null,
      };

      if (includeDescription) {
        item.description = task.description || "";
      }
      if (includeTags) {
        item.tags = task.tags?.map((t) => t.name) || [];
      }
      if (includeStatus) {
        item.statut = getStatusLabel(task.status);
      }
      if (includePriority) {
        item.priorite = getPriorityLabel(task.priority);
      }

      return item;
    });

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, "planning-export.json", "application/json");
  };

  const exportToWord = async () => {
    // Build headers
    const headers = ["Titre", "Date"];
    if (includeDescription) headers.push("Description");
    if (includeTags) headers.push("Tags");
    if (includeStatus) headers.push("Statut");
    if (includePriority) headers.push("Priorité");

    // Create header row
    const headerCells = headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E5E7EB" },
        })
    );

    // Create data rows
    const dataRows = filteredTasks.map((task) => {
      const cells: TableCell[] = [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: task.title, size: 20 })],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: task.due_date
                    ? format(new Date(task.due_date), "dd/MM/yyyy", { locale: fr })
                    : "-",
                  size: 20,
                }),
              ],
            }),
          ],
        }),
      ];

      if (includeDescription) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (task.description || "-").replace(/<[^>]*>/g, ""),
                    size: 20,
                  }),
                ],
              }),
            ],
          })
        );
      }

      if (includeTags) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: task.tags?.map((t) => t.name).join(", ") || "-",
                    size: 20,
                  }),
                ],
              }),
            ],
          })
        );
      }

      if (includeStatus) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: getStatusLabel(task.status), size: 20 }),
                ],
              }),
            ],
          })
        );
      }

      if (includePriority) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: getPriorityLabel(task.priority), size: 20 }),
                ],
              }),
            ],
          })
        );
      }

      return new TableRow({ children: cells });
    });

    const table = new Table({
      rows: [new TableRow({ children: headerCells }), ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Planning Éditorial",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Exporté le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`,
                  italics: true,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            table,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "planning-export.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob(["\ufeff" + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  const handleExport = () => {
    if (exportFormat === "csv") {
      exportToCSV();
    } else if (exportFormat === "json") {
      exportToJSON();
    } else if (exportFormat === "docx") {
      exportToWord();
    }
    logUserAction("export_planning", { format: exportFormat });
  };

  const hasFilters = titleFilter || selectedTagIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter le planning
          </DialogTitle>
          <DialogDescription>
            Exportez tout le contenu ou filtrez les tâches à exporter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Filters section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filtres
              </Label>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Effacer les filtres
                </Button>
              )}
            </div>

            {/* Title filter */}
            <div className="space-y-2">
              <Label htmlFor="title-filter" className="text-sm">
                Filtrer par titre
              </Label>
              <Input
                id="title-filter"
                placeholder="Ex: Patrimoine, Instagram..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
              />
            </div>

            {/* Tag filter */}
            <div className="space-y-2">
              <Label className="text-sm">Filtrer par tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id)
                        ? tag.color
                        : "transparent",
                      borderColor: tag.color,
                      color: selectedTagIds.includes(tag.id) ? "white" : tag.color,
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Aucun tag disponible
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {filteredTasks.length} tâche{filteredTasks.length > 1 ? "s" : ""} à exporter
              </span>
              {hasFilters && (
                <span className="text-xs text-muted-foreground">
                  (sur {tasks.length} au total)
                </span>
              )}
            </div>
          </div>

          {/* Export options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Options d'export</Label>

            {/* Format */}
            <div className="space-y-2">
              <Label htmlFor="format" className="text-sm">
                Format
              </Label>
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel)</SelectItem>
                  <SelectItem value="docx">Word (DOCX)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fields to include */}
            <div className="space-y-2">
              <Label className="text-sm">Colonnes à inclure</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeDescription}
                    onCheckedChange={(c) => setIncludeDescription(!!c)}
                  />
                  Description
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeTags}
                    onCheckedChange={(c) => setIncludeTags(!!c)}
                  />
                  Tags
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeStatus}
                    onCheckedChange={(c) => setIncludeStatus(!!c)}
                  />
                  Statut
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includePriority}
                    onCheckedChange={(c) => setIncludePriority(!!c)}
                  />
                  Priorité
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={filteredTasks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
