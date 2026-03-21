import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase"; // Asegúrate de que esta ruta apunte a tu cliente de Supabase
import { useAuth } from "@/contexts/AuthContext";
import { Area, DEFAULT_AREAS, createEmptyStudents } from "@/lib/grades";
import { toast } from "sonner";

export interface TeacherData {
  centerName: string;
  level: string;
  course: string;
  schoolYear: string;
  logo: string;
  areas: Area[];
  students: any[];
  customComments: Record<number, Record<string, string>>;
}

const DEFAULT_DATA: TeacherData = {
  centerName: "CEIP CALATRAVA",
  level: "PRIMARIA",
  course: "6º A",
  schoolYear: "2025/2026",
  logo: "",
  areas: DEFAULT_AREAS,
  students: createEmptyStudents(25, DEFAULT_AREAS),
  customComments: {},
};

export function useTeacherData() {
  const { user } = useAuth();
  const [data, setData] = useState<TeacherData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<TeacherData>(DEFAULT_DATA);

  const historyRef = useRef<TeacherData[]>([]);
  const futureRef = useRef<TeacherData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  // --- CARGAR DATOS ---
  useEffect(() => {
    if (!user) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data: row, error } = await supabase
          .from("teacher_data")
          .select("*")
          .eq("id", user.id) // Cambiado de user_id a id para coincidir con el SQL
          .maybeSingle();

        if (error) throw error;

        if (row) {
          const loaded: TeacherData = {
            centerName: row.center_name || "",
            level: row.level || "",
            course: row.course || "",
            schoolYear: row.school_year || "",
            logo: row.logo || "",
            areas: (row.areas as any) || DEFAULT_AREAS,
            students: (row.students as any) || [],
            customComments: (row.custom_comments as any) || {},
          };
          setData(loaded);
          latestDataRef.current = loaded;
        } else {
          // Si no existe la fila, la creamos (Aunque el Trigger de SQL debería hacerlo)
          await supabase.from("teacher_data").insert({
            id: user.id,
            center_name: DEFAULT_DATA.centerName,
            level: DEFAULT_DATA.level,
            course: DEFAULT_DATA.course,
            school_year: DEFAULT_DATA.schoolYear,
            areas: DEFAULT_DATA.areas as any,
            students: DEFAULT_DATA.students as any,
          });
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Error al conectar con la base de datos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // --- GUARDAR DATOS ---
  const saveToDb = useCallback(
    async (newData: TeacherData) => {
      if (!user) return;
      setSaving(true);
      try {
        const { error } = await supabase
          .from("teacher_data")
          .update({
            center_name: newData.centerName,
            level: newData.level,
            course: newData.course,
            school_year: newData.schoolYear,
            logo: newData.logo,
            areas: newData.areas as any,
            students: newData.students as any,
            custom_comments: newData.customComments as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id); // Cambiado de user_id a id

        if (error) throw error;
      } catch (err) {
        console.error("Error saving:", err);
        toast.error("Error al sincronizar");
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  const pushHistory = useCallback(
    (state: TeacherData) => {
      historyRef.current = [...historyRef.current.slice(-9), state];
      futureRef.current = [];
      updateHistoryState();
    },
    [updateHistoryState],
  );

  const updateData = useCallback(
    (partial: Partial<TeacherData>) => {
      setData((prev) => {
        pushHistory(prev);
        const next = { ...prev, ...partial };
        latestDataRef.current = next;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveToDb(latestDataRef.current);
        }, 1000); // Guardado automático tras 1 segundo de inactividad

        return next;
      });
    },
    [saveToDb, pushHistory],
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current.slice(-9), latestDataRef.current];
    setData(prev);
    latestDataRef.current = prev;
    updateHistoryState();
    saveToDb(prev);
  }, [saveToDb, updateHistoryState]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    historyRef.current = [
      ...historyRef.current.slice(-9),
      latestDataRef.current,
    ];
    setData(next);
    latestDataRef.current = next;
    updateHistoryState();
    saveToDb(next);
  }, [saveToDb, updateHistoryState]);

  return { data, updateData, loading, saving, undo, redo, canUndo, canRedo };
}
