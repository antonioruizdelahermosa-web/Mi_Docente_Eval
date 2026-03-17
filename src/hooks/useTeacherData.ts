import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Area, StudentRow, DEFAULT_AREAS, createEmptyStudents } from "@/lib/grades";
import { toast } from "sonner";

export interface TeacherData {
  centerName: string;
  level: string;
  course: string;
  schoolYear: string;
  logo: string;
  areas: Area[];
  students: StudentRow[];
  customComments: Record<number, Record<string, string>>;
}

const DEFAULT_DATA: TeacherData = {
  centerName: "CEIP Calatrava",
  level: "",
  course: "",
  schoolYear: "2025-2026",
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

  // Undo/redo history (max 5)
  const historyRef = useRef<TeacherData[]>([]);
  const futureRef = useRef<TeacherData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  // Load data on mount / user change
  useEffect(() => {
    if (!user) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data: row, error } = await supabase
        .from("teacher_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading teacher data:", error);
        toast.error("Error al cargar tus datos");
        setLoading(false);
        return;
      }

      if (row) {
        const loaded: TeacherData = {
          centerName: row.center_name,
          level: row.level,
          course: row.course,
          schoolYear: row.school_year,
          logo: (row as any).logo || "",
          areas: row.areas as unknown as Area[],
          students: row.students as unknown as StudentRow[],
          customComments: row.custom_comments as unknown as Record<number, Record<string, string>>,
        };
        // Ensure at least 25 rows
        if (loaded.students.length < 25) {
          const extra = createEmptyStudents(25 - loaded.students.length, loaded.areas);
          extra.forEach((s, i) => (s.id = loaded.students.length + i + 1));
          loaded.students = [...loaded.students, ...extra];
        }
        setData(loaded);
        latestDataRef.current = loaded;
      } else {
        // Create initial row
      await supabase.from("teacher_data").insert([{
        user_id: user.id,
        center_name: DEFAULT_DATA.centerName,
        level: DEFAULT_DATA.level,
        course: DEFAULT_DATA.course,
        school_year: DEFAULT_DATA.schoolYear,
        logo: DEFAULT_DATA.logo,
        areas: JSON.parse(JSON.stringify(DEFAULT_DATA.areas)),
        students: JSON.parse(JSON.stringify(DEFAULT_DATA.students)),
        custom_comments: JSON.parse(JSON.stringify(DEFAULT_DATA.customComments)),
      }]);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  // Debounced save
  const saveToDb = useCallback(async (newData: TeacherData) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("teacher_data")
      .update({
        center_name: newData.centerName,
        level: newData.level,
        course: newData.course,
        school_year: newData.schoolYear,
        logo: newData.logo,
        areas: JSON.parse(JSON.stringify(newData.areas)),
        students: JSON.parse(JSON.stringify(newData.students)),
        custom_comments: JSON.parse(JSON.stringify(newData.customComments)),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar los datos");
    }
    setSaving(false);
  }, [user]);

  const pushHistory = useCallback((state: TeacherData) => {
    historyRef.current = [...historyRef.current.slice(-4), state];
    futureRef.current = [];
    updateHistoryState();
  }, [updateHistoryState]);

  const updateData = useCallback((partial: Partial<TeacherData>) => {
    setData((prev) => {
      pushHistory(prev);
      const next = { ...prev, ...partial };
      latestDataRef.current = next;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToDb(latestDataRef.current);
      }, 1500);

      return next;
    });
  }, [saveToDb, pushHistory]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current.slice(-4), latestDataRef.current];
    setData(prev);
    latestDataRef.current = prev;
    updateHistoryState();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToDb(latestDataRef.current), 1500);
  }, [saveToDb, updateHistoryState]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    historyRef.current = [...historyRef.current.slice(-4), latestDataRef.current];
    setData(next);
    latestDataRef.current = next;
    updateHistoryState();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToDb(latestDataRef.current), 1500);
  }, [saveToDb, updateHistoryState]);

  return { data, updateData, loading, saving, undo, redo, canUndo, canRedo };
}
