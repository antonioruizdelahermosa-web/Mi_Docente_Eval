import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  StudentRow, Area, getGradeCategory, getGradeColor, getGradeCategoryLabel,
  calculateAverage, generateStudentReport, generateAllSubjectComments, needsPlanDeTrabajo,
} from "@/lib/grades";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

interface Props {
  open: boolean;
  onClose: () => void;
  student: StudentRow | null;
  areas: Area[];
  customComments?: Record<number, Record<string, string>>;
  centerName?: string;
  level?: string;
  course?: string;
  schoolYear?: string;
  logo?: string;
}

export default function IndividualReportDialog({ open, onClose, student, areas, customComments = {}, centerName = "", level = "", course = "", schoolYear = "", logo = "" }: Props) {
  const [editedComment, setEditedComment] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  if (!student) return null;

  // Use custom comments if available, otherwise auto-generate with variants
  const savedComments = customComments[student.id];
  const autoComments = generateAllSubjectComments(student, areas);
  const areaComments = savedComments ? { ...autoComments, ...savedComments } : autoComments;

  const evaluatedAreas = areas.filter(a => student.grades[a.id] !== null && student.grades[a.id] !== undefined);
  const chartData = evaluatedAreas.map(a => ({
    subject: a.name.length > 12 ? a.name.substring(0, 12) + "…" : a.name,
    fullName: a.name,
    nota: student.grades[a.id]!,
    category: getGradeCategory(student.grades[a.id] ?? null),
  }));

  const avg = calculateAverage(student.grades, areas.map(a => a.id));
  const generalComment = generateStudentReport(student, areas, course);
  const hasPlan = needsPlanDeTrabajo(student);
  const markers = student.markers || {};

  const handleClose = () => {
    setShowEditor(false);
    setEditedComment("");
    onClose();
  };

  const getExportText = () => {
    if (editedComment) return editedComment;
    let text = generalComment + "\n\nVALORACIÓN POR ÁREAS:\n";
    evaluatedAreas.forEach(a => {
      text += `\n${a.name}:\n${areaComments[a.id] || ""}\n`;
    });
    return text;
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      let y = 20;
      if (logo) {
        try { pdf.addImage(logo, "JPEG", 15, y, 15, 15); y += 18; } catch {}
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(centerName || "", 15, y); y += 6;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text([level, course, schoolYear].filter(Boolean).join(" · "), 15, y); y += 8;
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Informe Individual — ${student.name}`, 15, y); y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(getExportText(), 180);
      lines.forEach((line: string) => {
        if (y > 280) { pdf.addPage(); y = 20; }
        pdf.text(line, 15, y);
        y += 5;
      });
      pdf.save(`Informe_${student.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch { toast.error("Error al generar PDF"); }
    setExporting(false);
  };

  const exportWord = async () => {
    setExporting(true);
    try {
      const text = getExportText();
      const paragraphs = text.split("\n").map(line =>
        new Paragraph({ children: [new TextRun({ text: line, size: 22, font: "Calibri" })] })
      );
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: `Informe Individual — ${student.name}`, bold: true, size: 32, font: "Calibri" })] }),
            new Paragraph({ children: [] }),
            ...paragraphs,
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_${student.name.replace(/\s+/g, "_")}.docx`);
      toast.success("Documento Word descargado");
    } catch { toast.error("Error al generar Word"); }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-display">
            <FileText className="h-5 w-5" />
            Informe Individual — {student.name || `Alumno ${student.id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {logo && <img src={logo} alt="Logo" className="h-10 w-10 rounded object-contain" />}
            <div className="flex-1">
              <span className="font-semibold">{centerName}</span>
              {(level || course || schoolYear) && (
                <span className="ml-2 text-xs">
                  {[level, course, schoolYear].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <span>Media: {avg !== null ? avg.toFixed(2).replace(".", ",") : "N/D"}</span>
          </div>

          {evaluatedAreas.length > 0 ? (
            <>
              {/* Radar or Bar chart */}
              {evaluatedAreas.length >= 3 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 10]} />
                    <Radar dataKey="nota" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="nota" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={getGradeColor(entry.category)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Grade cards */}
              <div className="grid grid-cols-2 gap-2">
                {evaluatedAreas.map(a => {
                  const val = student.grades[a.id]!;
                  const cat = getGradeCategory(val);
                  return (
                    <div key={a.id} className="flex justify-between items-center px-3 py-1.5 rounded text-sm border border-border" style={{ backgroundColor: getGradeColor(cat) + "15" }}>
                      <span>{a.name}</span>
                      <span className="font-bold">{val.toFixed(2).replace(".", ",")} — {getGradeCategoryLabel(cat)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Markers info */}
              {hasPlan && (
                <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/20">
                  <h4 className="font-semibold text-sm text-destructive mb-2">⚠ Marcadores del alumno/a</h4>
                  <div className="text-xs space-y-1 text-foreground">
                    {markers.repeater && <p>• <strong>Alumno repetidor</strong></p>}
                    {markers.failedSubjects && markers.failedSubjects.length > 0 && (
                      <div>
                        <p>• <strong>Áreas suspensas de cursos anteriores:</strong></p>
                        {markers.failedSubjects.map(fs => (
                          <p key={fs.areaId} className="ml-4">— {fs.areaName} ({fs.level === 'muy_insuficiente' ? 'Muy insuficiente' : 'Insuficiente'})</p>
                        ))}
                      </div>
                    )}
                    {markers.deficit && markers.deficit.length > 0 && (
                      <div>
                        <p>• <strong>Necesidades específicas:</strong></p>
                        {markers.deficit.map((d, i) => (
                          <p key={i} className="ml-4">— {d.type}</p>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-muted-foreground italic">El informe incluye un Plan de Trabajo según la legislación de Castilla-La Mancha.</p>
                  </div>
                </div>
              )}

              {/* General comment */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h4 className="font-semibold text-sm text-primary mb-2">Valoración General</h4>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{generalComment}</p>
              </div>

              {/* Per-subject comments */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-primary">Valoración por Áreas</h4>
                {evaluatedAreas.map(a => (
                  <div key={a.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                    <h5 className="font-medium text-xs text-primary mb-1">{a.name}</h5>
                    <p className="text-xs leading-relaxed text-foreground">{areaComments[a.id] || ""}</p>
                  </div>
                ))}
              </div>

              {/* Editable section */}
              {showEditor && (
                <div>
                  <h4 className="font-semibold text-sm text-primary mb-2">Editar antes de exportar</h4>
                  <Textarea
                    value={editedComment || getExportText()}
                    onChange={e => setEditedComment(e.target.value)}
                    className="min-h-[200px] text-sm leading-relaxed resize-none"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay calificaciones registradas.</p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setShowEditor(!showEditor)}>
            {showEditor ? "Ocultar editor" : "✏️ Editar texto"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting} className="gap-1">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={exportWord} disabled={exporting} className="gap-1">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
