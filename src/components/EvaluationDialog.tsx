import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles, Loader2, FileDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Area, StudentRow, getGradeCategory, getGradeCategoryLabel, getGradeColor } from "@/lib/grades";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";
import { saveAs } from "file-saver";

type Phase = "input" | "legal" | "reports";

interface StudentReport {
  studentName: string;
  report: string;
}

interface Props {
  areas: Area[];
  students: StudentRow[];
  course: string;
  centerName: string;
  level: string;
  schoolYear: string;
  logo: string;
  customComments: Record<number, Record<string, string>>;
}

export default function EvaluationDialog({
  areas, students, course, centerName, level, schoolYear, logo, customComments,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [phase, setPhase] = useState<Phase>("input");

  // Phase 1
  const [contents, setContents] = useState("");
  const [activities, setActivities] = useState("");
  const [processingAI, setProcessingAI] = useState(false);

  // Phase 2
  const [saberes, setSaberes] = useState("");
  const [competencias, setCompetencias] = useState("");
  const [criterios, setCriterios] = useState("");
  const [generatingReports, setGeneratingReports] = useState(false);

  // Phase 3
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [selectedReportIdx, setSelectedReportIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const studentsWithNames = students.filter(s => s.name.trim());

  const reset = () => {
    setPhase("input");
    setContents("");
    setActivities("");
    setSaberes("");
    setCompetencias("");
    setCriterios("");
    setStudentReports([]);
    setSelectedReportIdx(0);
    setSelectedArea(null);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSelectArea = (area: Area) => {
    setSelectedArea(area);
    setPhase("input");
    setOpen(true);
  };

  // Phase 1 → Phase 2
  const handleProcessAI = async () => {
    if (!contents.trim() || !activities.trim()) {
      toast.error("Rellena los contenidos y actividades");
      return;
    }
    setProcessingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-area", {
        body: {
          area: selectedArea!.name,
          course,
          contents,
          activities,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSaberes(data.saberes_basicos || "");
      setCompetencias(data.competencias_especificas || "");
      setCriterios(data.criterios_evaluacion || "");
      setPhase("legal");
      toast.success("Apartados legales generados correctamente");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al procesar con IA");
    }
    setProcessingAI(false);
  };

  // Phase 2 → Phase 3
  const handleGenerateReports = async () => {
    if (!saberes.trim() || !competencias.trim() || !criterios.trim()) {
      toast.error("Revisa los apartados legales antes de continuar");
      return;
    }
    const evaluatedStudents = studentsWithNames.filter(
      s => s.grades[selectedArea!.id] !== null && s.grades[selectedArea!.id] !== undefined
    );
    if (evaluatedStudents.length === 0) {
      toast.error("No hay alumnos con calificación en esta área");
      return;
    }
    setGeneratingReports(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-student-reports", {
        body: {
          area: selectedArea!.name,
          course,
          saberes_basicos: saberes,
          competencias_especificas: competencias,
          criterios_evaluacion: criterios,
          students: evaluatedStudents.map(s => ({
            name: s.name,
            grade: s.grades[selectedArea!.id],
            markers: s.markers || {},
          })),
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setStudentReports(data.reports || []);
      setSelectedReportIdx(0);
      setPhase("reports");
      toast.success("Informes individuales generados");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al generar informes");
    }
    setGeneratingReports(false);
  };

  const updateReport = (idx: number, text: string) => {
    setStudentReports(prev => prev.map((r, i) => i === idx ? { ...r, report: text } : r));
  };

  const currentStudent = studentReports[selectedReportIdx];
  const currentStudentData = currentStudent
    ? studentsWithNames.find(s => s.name === currentStudent.studentName)
    : null;

  // Build chart data for current student
  const chartData = currentStudentData
    ? areas
        .filter(a => currentStudentData.grades[a.id] !== null && currentStudentData.grades[a.id] !== undefined)
        .map(a => ({
          subject: a.name.length > 10 ? a.name.substring(0, 10) + "…" : a.name,
          nota: currentStudentData.grades[a.id]!,
          category: getGradeCategory(currentStudentData.grades[a.id]!),
        }))
    : [];

  // Export helpers
  const getFullReportText = () => {
    if (!currentStudent || !currentStudentData) return "";
    const savedComments = customComments[currentStudentData.id];
    let text = `INFORME DE EVALUACIÓN — ${currentStudent.studentName}\n`;
    text += `${centerName} · ${[level, course, schoolYear].filter(Boolean).join(" · ")}\n`;
    text += `Área: ${selectedArea!.name}\n\n`;

    // General comment
    if (savedComments) {
      const generalComment = Object.values(savedComments).join("\n");
      if (generalComment.trim()) {
        text += `COMENTARIO GENERAL:\n${generalComment}\n\n`;
      }
    }

    // AI-generated qualitative report
    text += `INFORME CUALITATIVO (${selectedArea!.name}):\n${currentStudent.report}\n\n`;

    // Legal framework
    text += `SABERES BÁSICOS:\n${saberes}\n\n`;
    text += `COMPETENCIAS ESPECÍFICAS:\n${competencias}\n\n`;
    text += `CRITERIOS DE EVALUACIÓN:\n${criterios}\n`;

    return text;
  };

  const captureChart = async (): Promise<string | null> => {
    if (!chartRef.current) return null;
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
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
      pdf.text([level, course, schoolYear].filter(Boolean).join(" · "), 15, y); y += 10;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Informe — ${currentStudent!.studentName}`, 15, y); y += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Área: ${selectedArea!.name}`, 15, y); y += 8;

      // Chart image
      const chartImg = await captureChart();
      if (chartImg) {
        try {
          pdf.addImage(chartImg, "PNG", 15, y, 180, 80);
          y += 85;
        } catch {}
      }

      // Report text
      const text = getFullReportText();
      const lines = pdf.splitTextToSize(text, 180);
      lines.forEach((line: string) => {
        if (y > 280) { pdf.addPage(); y = 20; }
        pdf.text(line, 15, y);
        y += 5;
      });

      pdf.save(`Informe_${currentStudent!.studentName.replace(/\s+/g, "_")}_${selectedArea!.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF descargado");
    } catch {
      toast.error("Error al generar PDF");
    }
    setExporting(false);
  };

  const exportWord = async () => {
    setExporting(true);
    try {
      const text = getFullReportText();
      const children: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: `Informe — ${currentStudent!.studentName}`, bold: true, size: 32, font: "Calibri" })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Área: ${selectedArea!.name} · ${[level, course, schoolYear].filter(Boolean).join(" · ")}`, size: 22, font: "Calibri" })],
        }),
        new Paragraph({ children: [] }),
      ];

      // Chart image for Word
      const chartImg = await captureChart();
      if (chartImg) {
        try {
          const base64 = chartImg.split(",")[1];
          const imgBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          children.push(
            new Paragraph({
              children: [
                new ImageRun({ data: imgBuffer, transformation: { width: 600, height: 260 }, type: "png" }),
              ],
            }),
            new Paragraph({ children: [] })
          );
        } catch {}
      }

      // Text paragraphs
      text.split("\n").forEach(line => {
        const isBold = line === line.toUpperCase() && line.trim().length > 3;
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 22, font: "Calibri", bold: isBold })],
          })
        );
      });

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_${currentStudent!.studentName.replace(/\s+/g, "_")}_${selectedArea!.name.replace(/\s+/g, "_")}.docx`);
      toast.success("Word descargado");
    } catch {
      toast.error("Error al generar Word");
    }
    setExporting(false);
  };

  return (
    <>
      {/* Trigger: Dropdown with areas */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1" title="Evaluación avanzada con IA">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Evaluación IA</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {areas.map(a => (
            <DropdownMenuItem key={a.id} onClick={() => handleSelectArea(a)}>
              {a.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-display">
              <Sparkles className="h-5 w-5" />
              Evaluación IA — {selectedArea?.name || ""}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {phase === "input" && "Paso 1: Entrada de datos"}
                {phase === "legal" && "Paso 2: Apartados legales"}
                {phase === "reports" && "Paso 3: Informes individuales"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* PHASE 1: Input */}
          {phase === "input" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Introduce los contenidos trabajados y las actividades realizadas en <strong>{selectedArea?.name}</strong> durante el trimestre.
                Puedes pegar desde Word, Excel o cualquier fuente.
              </p>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Contenidos trabajados en el trimestre
                </label>
                <Textarea
                  value={contents}
                  onChange={e => setContents(e.target.value)}
                  placeholder="Pega o escribe los contenidos trabajados..."
                  className="min-h-[150px] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Actividades realizadas en el aula
                </label>
                <Textarea
                  value={activities}
                  onChange={e => setActivities(e.target.value)}
                  placeholder="Describe las actividades realizadas..."
                  className="min-h-[150px] text-sm resize-none"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleProcessAI} disabled={processingAI} className="gap-2">
                  {processingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Procesar con IA
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* PHASE 2: Legal sections */}
          {phase === "legal" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Revisa y edita los apartados legales generados. Basados en la LOMLOE y la legislación de Castilla-La Mancha para <strong>{course || "el curso indicado"}</strong>.
              </p>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Saberes Básicos</label>
                <Textarea
                  value={saberes}
                  onChange={e => setSaberes(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Competencias Específicas</label>
                <Textarea
                  value={competencias}
                  onChange={e => setCompetencias(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Criterios de Evaluación</label>
                <Textarea
                  value={criterios}
                  onChange={e => setCriterios(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setPhase("input")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleGenerateReports} disabled={generatingReports} className="gap-2">
                  {generatingReports ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generar Informes de Alumnos
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* PHASE 3: Student reports */}
          {phase === "reports" && studentReports.length > 0 && (
            <div className="space-y-4">
              {/* Student navigation */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
                <Button
                  variant="ghost" size="sm"
                  disabled={selectedReportIdx === 0}
                  onClick={() => setSelectedReportIdx(i => i - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">
                  {currentStudent?.studentName} ({selectedReportIdx + 1}/{studentReports.length})
                </span>
                <Button
                  variant="ghost" size="sm"
                  disabled={selectedReportIdx === studentReports.length - 1}
                  onClick={() => setSelectedReportIdx(i => i + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Grade info */}
              {currentStudentData && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Nota en {selectedArea!.name}:</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: getGradeColor(getGradeCategory(currentStudentData.grades[selectedArea!.id])) + "20",
                      color: getGradeColor(getGradeCategory(currentStudentData.grades[selectedArea!.id])),
                    }}
                  >
                    {currentStudentData.grades[selectedArea!.id]?.toFixed(2).replace(".", ",")} — {getGradeCategoryLabel(getGradeCategory(currentStudentData.grades[selectedArea!.id]))}
                  </span>
                </div>
              )}

              {/* Chart */}
              {chartData.length > 0 && (
                <div ref={chartRef} className="bg-white rounded-lg p-2">
                  {chartData.length >= 3 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={chartData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 10]} />
                        <Radar dataKey="nota" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
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
                </div>
              )}

              {/* Editable report */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Informe cualitativo (editable)
                </label>
                <Textarea
                  value={currentStudent?.report || ""}
                  onChange={e => updateReport(selectedReportIdx, e.target.value)}
                  className="min-h-[180px] text-sm resize-none leading-relaxed"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setPhase("legal")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Volver a legales
                </Button>
                <Button variant="outline" onClick={handleClose}>Cerrar</Button>
                <Button size="sm" onClick={exportPDF} disabled={exporting} className="gap-1">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  PDF
                </Button>
                <Button size="sm" variant="secondary" onClick={exportWord} disabled={exporting} className="gap-1">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Word
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
