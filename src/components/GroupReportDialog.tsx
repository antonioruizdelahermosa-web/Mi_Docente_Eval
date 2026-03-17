import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  StudentRow, Area, GradeCategory, getGradeCategory, getGradeColor, getGradeCategoryLabel,
  getSubjectAverage, getGradeDistribution, generateGroupPedagogicalComment,
} from "@/lib/grades";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

interface Props {
  open: boolean;
  onClose: () => void;
  students: StudentRow[];
  areas: Area[];
  centerName?: string;
  level?: string;
  course?: string;
  schoolYear?: string;
  logo?: string;
}

const CATS: GradeCategory[] = ['sobresaliente', 'notable', 'bien', 'suficiente', 'insuficiente'];
const CAT_COLORS: Record<string, string> = {
  sobresaliente: '#16a34a', notable: '#3b82f6', bien: '#eab308',
  suficiente: '#f97316', insuficiente: '#dc2626',
};

export default function GroupReportDialog({ open, onClose, students, areas, centerName = "", level = "", course = "", schoolYear = "", logo = "" }: Props) {
  const [editedComment, setEditedComment] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const evaluated = students.filter(s => s.name.trim());

  const avgData = areas.map(a => {
    const avg = getSubjectAverage(evaluated, a.id);
    return {
      subject: a.name.length > 10 ? a.name.substring(0, 10) + "…" : a.name,
      media: avg !== null ? Math.round(avg * 100) / 100 : 0,
      hasData: avg !== null,
      category: avg !== null ? getGradeCategory(avg) : 'empty' as GradeCategory,
    };
  }).filter(d => d.hasData);

  // Per-subject percentage table
  const subjectPercentages = areas.map(a => {
    const dist = getGradeDistribution(evaluated, a.id);
    const total = CATS.reduce((sum, c) => sum + dist[c], 0);
    return {
      area: a,
      total,
      percentages: CATS.map(c => ({ cat: c, count: dist[c], pct: total > 0 ? ((dist[c] / total) * 100).toFixed(1) : "0.0" })),
    };
  }).filter(s => s.total > 0);

  // Aggregate pie data
  const totalDist: Record<string, number> = { sobresaliente: 0, notable: 0, bien: 0, suficiente: 0, insuficiente: 0 };
  areas.forEach(a => {
    const dist = getGradeDistribution(evaluated, a.id);
    CATS.forEach(c => { totalDist[c] += dist[c]; });
  });
  const pieData = Object.entries(totalDist).filter(([, v]) => v > 0).map(([key, value]) => ({
    name: getGradeCategoryLabel(key as GradeCategory), value, color: CAT_COLORS[key],
  }));

  const groupComment = generateGroupPedagogicalComment(evaluated, areas);

  const handleClose = () => { setShowEditor(false); setEditedComment(""); onClose(); };

  const getExportText = () => editedComment || groupComment;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      let y = 20;
      if (logo) {
        try { pdf.addImage(logo, "JPEG", 15, y, 15, 15); y += 18; } catch {}
      }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
      pdf.text(centerName || "", 15, y); y += 6;
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text([level, course, schoolYear].filter(Boolean).join(" · "), 15, y); y += 8;
      pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
      pdf.text("Informe Grupal de Rendimiento", 15, y); y += 10;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(getExportText(), 180);
      lines.forEach((line: string) => { if (y > 280) { pdf.addPage(); y = 20; } pdf.text(line, 15, y); y += 5; });
      pdf.save("Informe_Grupal.pdf");
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
        sections: [{ properties: {}, children: [
          new Paragraph({ children: [new TextRun({ text: "Informe Grupal de Rendimiento", bold: true, size: 32, font: "Calibri" })] }),
          new Paragraph({ children: [] }),
          ...paragraphs,
        ] }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Informe_Grupal.docx");
      toast.success("Documento Word descargado");
    } catch { toast.error("Error al generar Word"); }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-display">
            <Users className="h-5 w-5" />
            Informe Grupal — {centerName || "Centro"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {logo && <img src={logo} alt="Logo" className="h-10 w-10 rounded object-contain" />}
            <div className="flex-1">
              {(level || course || schoolYear) && (
                <span className="text-xs">{[level, course, schoolYear].filter(Boolean).join(" · ")}</span>
              )}
              <span className="ml-2">{evaluated.length} alumnos evaluados</span>
            </div>
          </div>

          {avgData.length > 0 ? (
            <>
              {/* Bar chart - averages */}
              <div>
                <h4 className="font-semibold text-sm text-primary mb-2">Medias por Asignatura</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={avgData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                      {avgData.map((entry, i) => (
                        <Cell key={i} fill={getGradeColor(entry.category)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Percentage table */}
              <div>
                <h4 className="font-semibold text-sm text-primary mb-2">Porcentajes de Calificaciones por Área</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-primary/5">
                        <th className="px-3 py-2 text-left font-semibold text-primary border border-border">Área</th>
                        {CATS.map(c => (
                          <th key={c} className="px-2 py-2 text-center font-semibold border border-border" style={{ color: CAT_COLORS[c] }}>
                            {getGradeCategoryLabel(c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjectPercentages.map(s => (
                        <tr key={s.area.id} className="hover:bg-muted/50">
                          <td className="px-3 py-1.5 border border-border font-medium">{s.area.name}</td>
                          {s.percentages.map(p => (
                            <td key={p.cat} className="px-2 py-1.5 text-center border border-border">
                              <span className="font-bold">{p.pct}%</span>
                              <span className="text-muted-foreground ml-1">({p.count})</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie chart */}
              {pieData.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-primary mb-2">Distribución General de Calificaciones</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pedagogical comment */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h4 className="font-semibold text-sm text-primary mb-2">Comentario Pedagógico del Grupo</h4>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{groupComment}</p>
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
            <p className="text-muted-foreground text-center py-8">No hay datos suficientes para generar el informe grupal.</p>
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
