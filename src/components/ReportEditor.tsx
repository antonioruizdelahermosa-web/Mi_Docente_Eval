import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StudentRow, Area } from "@/lib/grades";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

interface ReportEditorProps {
  open: boolean;
  onClose: () => void;
  reportText: string;
  title: string;
  students: StudentRow[];
  areas: Area[];
}

export default function ReportEditor({ open, onClose, reportText, title, students, areas }: ReportEditorProps) {
  const [text, setText] = useState(reportText);
  const [exporting, setExporting] = useState(false);

  // Reset text when reportText changes
  if (reportText !== "" && text === "" && open) {
    setText(reportText);
  }

  const handleClose = () => {
    setText("");
    onClose();
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      pdf.setFont("helvetica");
      pdf.setFontSize(12);
      const lines = pdf.splitTextToSize(text, 180);
      let y = 20;
      pdf.setFontSize(16);
      pdf.text(title, 15, y);
      y += 12;
      pdf.setFontSize(10);
      lines.forEach((line: string) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 15, y);
        y += 5;
      });
      pdf.save(`${title.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch {
      toast.error("Error al generar PDF");
    }
    setExporting(false);
  };

  const exportWord = async () => {
    setExporting(true);
    try {
      const paragraphs = text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22,
                font: "Calibri",
              }),
            ],
          })
      );

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 32,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({ children: [] }),
              ...paragraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${title.replace(/\s+/g, "_")}.docx`);
      toast.success("Documento Word descargado");
    } catch {
      toast.error("Error al generar Word");
    }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[400px] font-body text-sm leading-relaxed resize-none"
            placeholder="Edita el informe antes de exportar..."
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={exportPDF} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Descargar PDF
          </Button>
          <Button onClick={exportWord} disabled={exporting} variant="secondary" className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Descargar Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
