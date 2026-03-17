import { useState, useCallback, useRef, ClipboardEvent } from "react";
import { Area, StudentRow, StudentMarkers, getGradeLabel, getGradeClass } from "@/lib/grades";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import StudentMarkersPopover from "@/components/StudentMarkersPopover";

interface GradeTableProps {
  students: StudentRow[];
  setStudents: (s: StudentRow[]) => void;
  areas: Area[];
  setAreas: (a: Area[]) => void;
  privacyMode: boolean;
  showInitials?: boolean;
  onToggleInitials?: () => void;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").join(".");
}

function GradeInput({ value, onChange, className, onNavigate }: { value: number | null; onChange: (v: number | null) => void; className: string; onNavigate?: (dir: "up" | "down" | "left" | "right") => void }) {
  const [text, setText] = useState(value !== null && value !== undefined ? String(value) : "");
  const prevValue = useRef(value);

  // Sync from parent when value changes externally (e.g. paste)
  if (prevValue.current !== value) {
    prevValue.current = value;
    const newText = value !== null && value !== undefined ? String(value) : "";
    if (newText !== text && !(text.endsWith(".") || text.endsWith(","))) {
      setText(newText);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { setText(""); onChange(null); return; }
    const normalized = raw.replace(",", ".");
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setText(raw);
    if (!normalized.endsWith(".")) {
      const num = parseFloat(normalized);
      if (!isNaN(num) && num >= 0 && num <= 10) onChange(num);
    }
  };

  const handleBlur = () => {
    if (text === "") return;
    const num = parseFloat(text.replace(",", "."));
    if (isNaN(num) || num < 0 || num > 10) { setText(value !== null && value !== undefined ? String(value) : ""); return; }
    const clamped = Math.min(10, Math.max(0, num));
    onChange(clamped);
    setText(String(clamped));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onNavigate) return;
    if (e.key === "ArrowUp") { e.preventDefault(); onNavigate("up"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); onNavigate("down"); }
    else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) { onNavigate("left"); }
    else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) { onNavigate("right"); }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder="—"
    />
  );
}

export default function GradeTable({ students, setStudents, areas, setAreas, privacyMode, showInitials, onToggleInitials }: GradeTableProps) {
  const [newAreaName, setNewAreaName] = useState("");
  const [showAddArea, setShowAddArea] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const [draggedArea, setDraggedArea] = useState<string | null>(null);

  const focusCell = useCallback((row: number, col: number) => {
    if (!tableRef.current) return;
    // col 0 = name input, col 1..N = grade inputs
    const tbody = tableRef.current.querySelector("tbody");
    if (!tbody) return;
    const tr = tbody.children[row] as HTMLElement | undefined;
    if (!tr) return;
    // Collect all inputs in the row
    const inputs = tr.querySelectorAll<HTMLInputElement>("input");
    const input = inputs[col];
    if (input) { input.focus(); input.select(); }
  }, []);

  const updateStudent = (index: number, field: "name", value: string) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const updateMarkers = (index: number, markers: StudentMarkers) => {
    const updated = [...students];
    updated[index] = { ...updated[index], markers };
    setStudents(updated);
  };

  const updateGrade = (index: number, areaId: string, num: number | null) => {
    const updated = [...students];
    updated[index] = {
      ...updated[index],
      grades: { ...updated[index].grades, [areaId]: num },
    };
    setStudents(updated);
  };

  const addArea = () => {
    if (!newAreaName.trim()) return;
    const id = newAreaName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const newArea = { id, name: newAreaName.trim() };
    setAreas([...areas, newArea]);
    const updated = students.map((s) => ({ ...s, grades: { ...s.grades, [id]: null } }));
    setStudents(updated);
    setNewAreaName("");
    setShowAddArea(false);
  };

  const removeArea = (areaId: string) => {
    setAreas(areas.filter((a) => a.id !== areaId));
    const updated = students.map((s) => {
      const grades = { ...s.grades };
      delete grades[areaId];
      return { ...s, grades };
    });
    setStudents(updated);
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTableElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const rows = text.split("\n").filter((r) => r.trim());
      if (rows.length <= 1 && !rows[0]?.includes("\t") && !rows[0]?.includes(";") && !rows[0]?.includes(",")) return;
      e.preventDefault();

      // Detect delimiter: tab > semicolon > comma
      const firstRow = rows[0] || "";
      const delimiter = firstRow.includes("\t") ? "\t" : firstRow.includes(";") ? ";" : ",";

      const updated = [...students];
      rows.forEach((row, ri) => {
        if (ri >= updated.length) return;
        const cells = row.split(delimiter).map(c => c.trim());
        if (cells.length === 0) return;

        let colIndex = 0;

        // Skip leading number column (student ID/number)
        if (cells.length > 1 && /^\d+$/.test(cells[0])) {
          colIndex = 1;
        }

        // Detect name column: first non-numeric cell
        if (colIndex < cells.length && isNaN(parseFloat(cells[colIndex].replace(",", ".")))) {
          updated[ri] = { ...updated[ri], name: cells[colIndex] };
          colIndex++;
        }

        // Remaining cells are grades
        areas.forEach((area, ai) => {
          const cellVal = cells[colIndex + ai];
          if (cellVal !== undefined && cellVal.trim() !== "") {
            const num = parseFloat(cellVal.replace(",", ".").trim());
            updated[ri] = {
              ...updated[ri],
              grades: { ...updated[ri].grades, [area.id]: isNaN(num) ? null : Math.min(10, Math.max(0, num)) },
            };
          }
        });
      });
      setStudents(updated);
      toast.success(`Datos pegados: ${rows.length} filas procesadas`);
    },
    [students, areas, setStudents]
  );

  const handleDragStart = (areaId: string) => setDraggedArea(areaId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedArea || draggedArea === targetId) return;
    const newAreas = [...areas];
    const fromIdx = newAreas.findIndex((a) => a.id === draggedArea);
    const toIdx = newAreas.findIndex((a) => a.id === targetId);
    const [moved] = newAreas.splice(fromIdx, 1);
    newAreas.splice(toIdx, 0, moved);
    setAreas(newAreas);
    setDraggedArea(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="overflow-hidden">
        <table ref={tableRef} className="w-full text-sm table-fixed" onPaste={handlePaste}>
          <colgroup>
            <col className="w-[30px]" />
            <col style={{ width: `${Math.max(13, 36 - areas.length * 2.5)}%` }} />
            <col className="w-[30px]" />
            {areas.map(a => (
              <col key={a.id} style={{ width: `${Math.max(6, (100 - Math.max(13, 36 - areas.length * 2.5) - 5 - 3) / areas.length)}%` }} />
            ))}
            <col className="w-[30px]" />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="px-1 py-2 text-left font-semibold text-muted-foreground text-xs">#</th>
              <th className="px-1 py-2 text-left font-semibold text-muted-foreground text-xs">
                <div className="flex items-center gap-1">
                  <span className="truncate">Nombre</span>
                  <button
                    onClick={() => onToggleInitials?.()}
                    className={`ml-1 text-[9px] px-1.5 py-0.5 rounded border transition-colors ${showInitials ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}
                    title={showInitials ? "Mostrar nombres completos" : "Mostrar solo iniciales"}
                  >
                    AB
                  </button>
                </div>
              </th>
              <th className="px-0 py-2 text-center font-semibold text-muted-foreground text-[9px]" title="Marcadores">
                <span>⚑</span>
              </th>
              {areas.map((area) => (
                <th
                  key={area.id}
                  className="px-1 py-2 text-center font-semibold text-muted-foreground cursor-grab"
                  draggable
                  onDragStart={() => handleDragStart(area.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(area.id)}
                >
                  <div className="flex items-center justify-center gap-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-[10px] leading-tight truncate block">{area.name}</span>
                    <button
                      onClick={() => removeArea(area.id)}
                      className="ml-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="Eliminar área"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-1 py-2">
                {showAddArea ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addArea()}
                      placeholder="Nombre"
                      className="h-7 text-xs w-24"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={addArea}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddArea(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setShowAddArea(true)}
                    title="Añadir área"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-2 py-1 text-muted-foreground font-medium text-center text-xs">{student.id}</td>
                <td className="px-2 py-1">
                  {showInitials && student.name.trim() ? (
                    <span className="text-xs text-foreground truncate block" title={student.name}>{getInitials(student.name)}</span>
                  ) : (
                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => updateStudent(idx, "name", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") { e.preventDefault(); focusCell(idx - 1, 0); }
                        else if (e.key === "ArrowDown") { e.preventDefault(); focusCell(idx + 1, 0); }
                        else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) { focusCell(idx, 1); }
                      }}
                      className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 text-xs truncate"
                      placeholder="Nombre"
                    />
                  )}
                </td>
                <td className="px-0 py-1 text-center">
                  <StudentMarkersPopover
                    markers={student.markers || {}}
                    onChange={(m) => updateMarkers(idx, m)}
                    areas={areas}
                    studentName={student.name}
                  />
                </td>
                {areas.map((area, areaIdx) => {
                  const grade = student.grades[area.id];
                  const cls = getGradeClass(grade);
                  const colIdx = showInitials ? areaIdx : areaIdx + 1; // input column index
                  return (
                    <td key={area.id} className="px-1 py-1 text-center">
                      {privacyMode ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${cls}`}>
                          {getGradeLabel(grade)}
                        </span>
                      ) : (
                        <GradeInput
                          value={grade}
                          onChange={(num) => updateGrade(idx, area.id, num)}
                          onNavigate={(dir) => {
                            if (dir === "up") focusCell(idx - 1, colIdx);
                            else if (dir === "down") focusCell(idx + 1, colIdx);
                            else if (dir === "left") focusCell(idx, colIdx - 1);
                            else if (dir === "right") focusCell(idx, colIdx + 1);
                          }}
                          className={`w-full text-center rounded px-1 py-0.5 text-xs outline-none border border-transparent focus:border-ring ${cls}`}
                        />
                      )}
                    </td>
                  );
                })}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
