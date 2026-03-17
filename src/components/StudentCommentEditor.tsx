import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RefreshCw, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import {
  StudentRow, Area, getGradeCategory, getGradeColor, getGradeCategoryLabel,
  generateAllSubjectComments,
} from "@/lib/grades";

interface Props {
  open: boolean;
  onClose: () => void;
  student: StudentRow | null;
  areas: Area[];
  /** Stored custom comments per student id → area id → text */
  customComments: Record<number, Record<string, string>>;
  onSaveComments: (studentId: number, comments: Record<string, string>) => void;
}

export default function StudentCommentEditor({ open, onClose, student, areas, customComments, onSaveComments }: Props) {
  const [comments, setComments] = useState<Record<string, string>>({});
  const [copiedArea, setCopiedArea] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    const saved = customComments[student.id];
    if (saved && Object.keys(saved).length > 0) {
      // Merge: keep saved, generate missing
      const auto = generateAllSubjectComments(student, areas);
      setComments({ ...auto, ...saved });
    } else {
      setComments(generateAllSubjectComments(student, areas));
    }
  }, [student, areas, customComments]);

  if (!student) return null;

  const evaluatedAreas = areas.filter(a => student.grades[a.id] !== null && student.grades[a.id] !== undefined);

  const handleChange = (areaId: string, value: string) => {
    setComments(prev => ({ ...prev, [areaId]: value }));
  };

  const handleSave = () => {
    onSaveComments(student.id, comments);
    toast.success("Comentarios guardados");
  };

  const handleCopy = async (areaId: string) => {
    try {
      await navigator.clipboard.writeText(comments[areaId] || "");
      setCopiedArea(areaId);
      setTimeout(() => setCopiedArea(null), 2000);
      toast.success("Comentario copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleCopyAll = async () => {
    const allText = evaluatedAreas
      .map(a => `${a.name}:\n${comments[a.id] || ""}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(allText);
      toast.success("Todos los comentarios copiados");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleRegenerate = (areaId: string) => {
    const auto = generateAllSubjectComments(student, areas);
    setComments(prev => ({ ...prev, [areaId]: auto[areaId] || "" }));
    toast.info("Comentario regenerado");
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { handleSave(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary font-display text-lg">
            Comentarios — {student.name || `Alumno ${student.id}`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            Edita los comentarios de cada área. Se usarán en el informe individual. Puedes copiar cada uno o todos a la vez.
          </p>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleCopyAll}>
              <ClipboardCopy className="h-3.5 w-3.5" /> Copiar todos
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {evaluatedAreas.map(a => {
            const val = student.grades[a.id]!;
            const cat = getGradeCategory(val);
            return (
              <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getGradeColor(cat) }} />
                    <span className="font-medium text-sm">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {val.toFixed(2).replace(".", ",")} — {getGradeCategoryLabel(cat)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRegenerate(a.id)} title="Regenerar">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(a.id)} title="Copiar">
                      {copiedArea === a.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={comments[a.id] || ""}
                  onChange={e => handleChange(a.id, e.target.value)}
                  className="text-xs leading-relaxed resize-none min-h-[80px]"
                />
              </div>
            );
          })}

          {evaluatedAreas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Este alumno no tiene calificaciones registradas.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => { handleSave(); onClose(); }}>
            Guardar y cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
