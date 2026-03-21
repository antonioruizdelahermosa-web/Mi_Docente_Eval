import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  GripVertical,
  Undo2,
  Redo2,
  Trash2,
  UserPlus,
  CheckSquare,
  ChevronDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

// --- INTERFAZ PARA CORREGIR ERRORES DE TYPESCRIPT ---
interface GradeTableProps {
  students: any[];
  setStudents: (s: any) => void;
  areas: any[];
  setAreas: (a: any) => void;
  onAddArea: () => void;
}

function SortableHead({ area, areas, setAreas, students, setStudents }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: area.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="p-0 border-r border-black bg-[#D1D5DB] w-[140px]"
    >
      <div className="flex items-center h-10 group relative">
        <div
          {...attributes}
          {...listeners}
          className="p-1 text-slate-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
        <input
          value={area.name}
          onChange={(e) =>
            setAreas(
              areas.map((a: any) =>
                a.id === area.id
                  ? { ...a, name: e.target.value.toUpperCase() }
                  : a,
              ),
            )
          }
          className="font-bold uppercase text-[11px] w-full bg-transparent border-none focus:ring-0 outline-none"
        />
        <button
          onClick={() => setAreas(areas.filter((a: any) => a.id !== area.id))}
          className="px-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </TableHead>
  );
}

export default function GradeTable({
  students,
  setStudents,
  areas,
  setAreas,
  onAddArea,
}: GradeTableProps) {
  const [privInitials, setPrivInitials] = useState(false);
  const [privLetters, setPrivLetters] = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const getInitials = (name: string) =>
    name
      ? name
          .trim()
          .split(/\s+/)
          .map((n) => n[0].toUpperCase() + ".")
          .join("")
      : "";

  return (
    <div className="space-y-4">
      {/* BARRA DE HERRAMIENTAS INTERNA */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <button
          onClick={() => setShowSelection(!showSelection)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border font-bold text-xs transition-all ${showSelection ? "bg-[#EA580C] text-white border-orange-700" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <CheckSquare size={16} />{" "}
          {showSelection ? `SELECCIONADOS: ${selected.length}` : "SELECCIONAR"}
        </button>

        <div className="ml-auto flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#10B981] text-white font-bold text-xs shadow-sm">
                MODO PRIVACIDAD <ChevronDown size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    Usar Iniciales
                  </span>
                  <Switch
                    checked={privInitials}
                    onCheckedChange={setPrivInitials}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    Ver Letras (SB/NT)
                  </span>
                  <Switch
                    checked={privLetters}
                    onCheckedChange={setPrivLetters}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* TABLA CON ESTILO SEGÚN IMAGE_410161 */}
      <div className="border border-black rounded-sm overflow-hidden bg-white shadow-md">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            if (e.active.id !== e.over?.id) {
              const oldIdx = areas.findIndex((a: any) => a.id === e.active.id);
              const newIdx = areas.findIndex((a: any) => a.id === e.over?.id);
              setAreas(arrayMove(areas, oldIdx, newIdx));
            }
          }}
        >
          <Table className="w-full border-collapse">
            <TableHeader>
              <TableRow className="bg-[#D1D5DB] border-b border-black h-10">
                <TableHead className="w-[60px] text-center border-r border-black font-bold text-black uppercase">
                  #
                </TableHead>
                <TableHead className="w-[350px] border-r border-black font-bold text-black uppercase px-4 text-left">
                  Alumno
                </TableHead>
                <SortableContext
                  items={areas.map((a) => a.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {areas.map((area) => (
                    <SortableHead
                      key={area.id}
                      area={area}
                      areas={areas}
                      setAreas={setAreas}
                      students={students}
                      setStudents={setStudents}
                    />
                  ))}
                </SortableContext>
                <TableHead className="bg-[#DBEAFE] border-l border-black p-0 text-center w-[60px]">
                  <button
                    onClick={onAddArea}
                    className="w-full h-10 flex items-center justify-center text-blue-700 hover:bg-blue-200"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, idx) => (
                <TableRow
                  key={student.id}
                  className={`border-b border-black h-12 transition-colors ${selected.includes(student.id) ? "bg-orange-50" : "even:bg-slate-50/50"}`}
                >
                  <TableCell className="p-0 border-r border-black text-center font-bold text-slate-600 bg-slate-100">
                    {showSelection ? (
                      <Checkbox
                        checked={selected.includes(student.id)}
                        onCheckedChange={(c) =>
                          setSelected(
                            c
                              ? [...selected, student.id]
                              : selected.filter((id) => id !== student.id),
                          )
                        }
                      />
                    ) : (
                      idx + 1
                    )}
                  </TableCell>
                  <TableCell className="p-0 border-r-4 border-black bg-[#EFF6FF] relative group">
                    <input
                      value={
                        privInitials ? getInitials(student.name) : student.name
                      }
                      onChange={(e) => {
                        const newS = [...students];
                        newS[idx].name = e.target.value.toUpperCase();
                        setStudents(newS);
                      }}
                      className="w-full h-12 px-4 bg-transparent font-bold text-[11px] uppercase outline-none focus:bg-white/50"
                    />
                    <button
                      onClick={() => {
                        const newS = [...students];
                        newS.splice(idx + 1, 0, {
                          id: crypto.randomUUID(),
                          name: "",
                          grades: {},
                        });
                        setStudents(newS);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white border border-blue-200 rounded text-blue-500 shadow-sm hover:scale-110 transition-transform"
                    >
                      <UserPlus size={14} strokeWidth={2.5} />
                    </button>
                  </TableCell>
                  {areas.map((area) => (
                    <TableCell
                      key={area.id}
                      className="p-0 border-r border-black"
                    >
                      <input
                        value={student.grades[area.id] || ""}
                        onChange={(e) => {
                          const newS = [...students];
                          newS[idx].grades[area.id] = e.target.value.replace(
                            ".",
                            ",",
                          );
                          setStudents(newS);
                        }}
                        className="w-full h-12 text-center font-bold text-lg outline-none bg-transparent focus:bg-slate-50"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-0 border-l border-black text-center w-[60px]">
                    <button
                      onClick={() =>
                        setStudents(students.filter((s) => s.id !== student.id))
                      }
                      className="w-full h-12 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
