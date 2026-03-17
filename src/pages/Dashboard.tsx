import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherData } from "@/hooks/useTeacherData";
import SchoolHeader from "@/components/SchoolHeader";
import GradeTable from "@/components/GradeTable";
import IndividualReportDialog from "@/components/IndividualReportDialog";
import GroupReportDialog from "@/components/GroupReportDialog";
import StudentCommentEditor from "@/components/StudentCommentEditor";
import EvaluationDialog from "@/components/EvaluationDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  LogIn,
  Trash2,
  FileText,
  Users,
  EyeOff,
  Eye,
  GraduationCap,
  Pencil,
  Loader2,
  Save,
  Undo2,
  Redo2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createEmptyStudents } from "@/lib/grades";

export default function Dashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data, updateData, loading, saving, undo, redo, canUndo, canRedo } = useTeacherData();

  const [privacyMode, setPrivacyMode] = useState(false);
  const [showInitials, setShowInitials] = useState(false);

  // Report dialog state
  const [individualReportOpen, setIndividualReportOpen] = useState(false);
  const [groupReportOpen, setGroupReportOpen] = useState(false);
  const [commentEditorOpen, setCommentEditorOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const handleSaveComments = (studentId: number, comments: Record<string, string>) => {
    updateData({ customComments: { ...data.customComments, [studentId]: comments } });
  };

  const studentsWithNames = data.students.filter((s) => s.name.trim());

  const handleClearTable = () => {
    updateData({ students: createEmptyStudents(25, data.areas) });
    toast.success("Tabla limpiada correctamente");
  };

  const handleIndividualReport = () => {
    if (!selectedStudent) {
      toast.error("Selecciona un alumno primero");
      return;
    }
    const student = data.students.find((s) => String(s.id) === selectedStudent);
    if (!student || !student.name.trim()) {
      toast.error("Alumno no encontrado");
      return;
    }
    setIndividualReportOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando datos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container max-w-7xl flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Gestión Docente</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3 animate-pulse" /> Guardando...
              </span>
            )}
            {user ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-1 text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="gap-1">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Acceso Docentes</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6 space-y-6 animate-fade-in">
        {/* School Header */}
        <SchoolHeader
          centerName={data.centerName}
          setCenterName={(v) => updateData({ centerName: v })}
          level={data.level}
          setLevel={(v) => updateData({ level: v })}
          course={data.course}
          setCourse={(v) => updateData({ course: v })}
          schoolYear={data.schoolYear}
          setSchoolYear={(v) => updateData({ schoolYear: v })}
          logo={data.logo}
          setLogo={(v) => updateData({ logo: v })}
        />

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Privacy toggle */}
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border shadow-sm">
            {privacyMode ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            <Label htmlFor="privacy" className="text-sm cursor-pointer">Privacidad</Label>
            <Switch id="privacy" checked={privacyMode} onCheckedChange={setPrivacyMode} />
          </div>

          <div className="flex-1" />

          {/* Individual report */}
          <div className="flex items-center gap-2">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Seleccionar alumno" />
              </SelectTrigger>
              <SelectContent>
                {studentsWithNames.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleIndividualReport}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Informe</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => {
              if (!selectedStudent) { toast.error("Selecciona un alumno primero"); return; }
              setCommentEditorOpen(true);
            }}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Comentarios</span>
            </Button>
          </div>

          {/* Evaluation AI */}
          <EvaluationDialog
            areas={data.areas}
            students={data.students}
            course={data.course}
            centerName={data.centerName}
            level={data.level}
            schoolYear={data.schoolYear}
            logo={data.logo}
            customComments={data.customComments}
          />

          {/* Group report */}
          <Button size="sm" className="gap-1" onClick={() => setGroupReportOpen(true)}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Informe Grupal</span>
          </Button>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1" onClick={undo} disabled={!canUndo} title="Deshacer">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={redo} disabled={!canRedo} title="Rehacer">
              <Redo2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-1">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpiar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Limpiar toda la tabla?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará todos los nombres y calificaciones. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearTable}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Grade Table */}
        <GradeTable
          students={data.students}
          setStudents={(students) => updateData({ students })}
          areas={data.areas}
          setAreas={(areas) => updateData({ areas })}
          privacyMode={privacyMode}
          showInitials={showInitials}
          onToggleInitials={() => setShowInitials(v => !v)}
        />

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center">
          {user
            ? "💾 Tus datos se guardan automáticamente en tu cuenta. 💡 Puedes pegar datos desde Excel (Ctrl+V)."
            : "💡 Puedes pegar datos desde Excel (Ctrl+V). Inicia sesión para guardar tus datos."}
        </p>
      </div>

      {/* Individual Report Dialog */}
      <IndividualReportDialog
        open={individualReportOpen}
        onClose={() => setIndividualReportOpen(false)}
        student={data.students.find(s => String(s.id) === selectedStudent) || null}
        areas={data.areas}
        customComments={data.customComments}
        centerName={data.centerName}
        level={data.level}
        course={data.course}
        schoolYear={data.schoolYear}
        logo={data.logo}
      />

      {/* Group Report Dialog */}
      <GroupReportDialog
        open={groupReportOpen}
        onClose={() => setGroupReportOpen(false)}
        students={data.students}
        areas={data.areas}
        centerName={data.centerName}
        level={data.level}
        course={data.course}
        schoolYear={data.schoolYear}
        logo={data.logo}
      />

      {/* Student Comment Editor */}
      <StudentCommentEditor
        open={commentEditorOpen}
        onClose={() => setCommentEditorOpen(false)}
        student={data.students.find(s => String(s.id) === selectedStudent) || null}
        areas={data.areas}
        customComments={data.customComments}
        onSaveComments={handleSaveComments}
      />
    </div>
  );
}
