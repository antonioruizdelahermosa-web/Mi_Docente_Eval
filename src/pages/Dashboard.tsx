import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherData } from "@/hooks/useTeacherData";
import GradeTable from "@/components/GradeTable";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  GraduationCap,
  Loader2,
  ClipboardPaste,
  FileText,
  User as UserIcon,
  Save,
  CheckCircle,
  Cloud,
  Plus, // Importación necesaria para el logo
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Dashboard() {
  const { signOut, user } = useAuth();
  const { data, updateData, loading } = useTeacherData();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [importType, setImportType] = useState("all");
  const [targetArea, setTargetArea] = useState("first");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleUpdateAndSave = async (newData: any) => {
    setIsSyncing(true);
    try {
      await updateData(newData);
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
          Cargando Panel...
        </p>
      </div>
    );

  // Protección contra datos nulos para evitar página en blanco
  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={24} />
            <h1 className="italic font-black text-slate-800 tracking-tighter text-lg uppercase">
              Gestión Docente
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase transition-colors ${isSyncing ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
            >
              {isSyncing ? (
                <Save size={12} className="animate-spin" />
              ) : (
                <Cloud size={12} />
              )}
              {isSyncing ? "Guardando..." : "Sincronizado"}
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 gap-2 h-9 px-4 uppercase text-xs shadow-sm"
            >
              <LogOut size={16} /> Salir
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto w-full p-6 space-y-8">
        {/* BANNER EDITABLE RECONSTRUIDO */}
        <div className="bg-[#1E293B] rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-2xl border-b-[6px] border-blue-600">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* LOGO */}
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {data?.logo ? (
                <img
                  src={data.logo}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Plus className="text-white/20" size={40} />
              )}
            </div>

            {/* DATOS */}
            <div className="flex-1 space-y-6 w-full text-center md:text-left">
              <input
                value={data?.centerName || ""}
                onChange={(e) =>
                  handleUpdateAndSave({
                    centerName: e.target.value.toUpperCase(),
                  })
                }
                className="bg-transparent text-white text-4xl md:text-6xl font-black tracking-tighter w-full outline-none focus:bg-white/5 rounded-lg px-2 -ml-2 transition-all"
                placeholder="NOMBRE DEL CENTRO"
              />

              <div className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-12">
                <div className="flex flex-col">
                  <label className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Etapa
                  </label>
                  <input
                    value={data?.level || ""}
                    onChange={(e) =>
                      handleUpdateAndSave({
                        level: e.target.value.toUpperCase(),
                      })
                    }
                    className="bg-transparent text-white font-bold text-xl outline-none border-b border-white/10 focus:border-blue-500 transition-all min-w-[120px]"
                    placeholder="ETAPA"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Curso
                  </label>
                  <input
                    value={data?.course || ""}
                    onChange={(e) =>
                      handleUpdateAndSave({
                        course: e.target.value.toUpperCase(),
                      })
                    }
                    className="bg-transparent text-white font-bold text-xl outline-none border-b border-white/10 focus:border-blue-500 transition-all min-w-[80px]"
                    placeholder="CURSO"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Año Académico
                  </label>
                  <input
                    value={data?.schoolYear || ""}
                    onChange={(e) =>
                      handleUpdateAndSave({
                        schoolYear: e.target.value.toUpperCase(),
                      })
                    }
                    className="bg-transparent text-white font-bold text-xl outline-none border-b border-white/10 focus:border-blue-500 transition-all min-w-[120px]"
                    placeholder="AÑO"
                  />
                </div>
              </div>
            </div>
          </div>
          <GraduationCap className="absolute right-[-20px] top-1/2 -translate-y-1/2 text-white opacity-[0.03] w-64 h-64 -rotate-12 pointer-events-none hidden lg:block" />
        </div>

        {/* CONTROLES */}
        <div className="flex justify-start gap-4">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg px-6 font-bold uppercase text-xs shadow-sm h-11 gap-2">
                <ClipboardPaste size={18} className="text-blue-600" /> PEGAR
                BLOQUE
              </Button>
            </DialogTrigger>
            <DialogContent>
              {/* Contenido del modal igual al anterior */}
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <GradeTable
            students={data.students || []}
            setStudents={(s: any) => handleUpdateAndSave({ students: s })}
            areas={data.areas || []}
            setAreas={(a: any) => handleUpdateAndSave({ areas: a })}
            onAddArea={() => {
              const newId = `area-${Date.now()}`;
              handleUpdateAndSave({
                areas: [...data.areas, { id: newId, name: "NUEVA ÁREA" }],
              });
            }}
          />
        </div>
      </main>
    </div>
  );
}
