import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, X } from "lucide-react";
import { StudentMarkers, FailedSubject, Area } from "@/lib/grades";

interface Props {
  markers: StudentMarkers;
  onChange: (m: StudentMarkers) => void;
  areas: Area[];
  studentName: string;
}

export default function StudentMarkersPopover({ markers, onChange, areas, studentName }: Props) {
  const [open, setOpen] = useState(false);
  const [newDeficit, setNewDeficit] = useState("");

  const hasAny = (markers.repeater) ||
    (markers.failedSubjects && markers.failedSubjects.length > 0) ||
    (markers.deficit && markers.deficit.length > 0);

  const toggleRepeater = () => {
    onChange({ ...markers, repeater: !markers.repeater });
  };

  const addFailedSubject = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const existing = markers.failedSubjects || [];
    if (existing.some(f => f.areaId === areaId)) return;
    onChange({
      ...markers,
      failedSubjects: [...existing, { areaId, areaName: area.name, level: "insuficiente" }],
    });
  };

  const removeFailedSubject = (areaId: string) => {
    onChange({
      ...markers,
      failedSubjects: (markers.failedSubjects || []).filter(f => f.areaId !== areaId),
    });
  };

  const updateFailedLevel = (areaId: string, level: "insuficiente" | "muy_insuficiente") => {
    onChange({
      ...markers,
      failedSubjects: (markers.failedSubjects || []).map(f =>
        f.areaId === areaId ? { ...f, level } : f
      ),
    });
  };

  const addDeficit = () => {
    if (!newDeficit.trim()) return;
    const existing = markers.deficit || [];
    onChange({ ...markers, deficit: [...existing, { type: newDeficit.trim() }] });
    setNewDeficit("");
  };

  const removeDeficit = (idx: number) => {
    onChange({
      ...markers,
      deficit: (markers.deficit || []).filter((_, i) => i !== idx),
    });
  };

  // Badge indicators
  const badgeCount =
    (markers.repeater ? 1 : 0) +
    (markers.failedSubjects?.length || 0) +
    (markers.deficit?.length || 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center justify-center w-full h-full min-h-[24px] rounded transition-colors ${
            hasAny
              ? "text-destructive hover:bg-destructive/10"
              : "text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/50"
          }`}
          title={hasAny ? `${badgeCount} marcador(es)` : "Añadir marcadores"}
        >
          {hasAny ? (
            <span className="relative">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="absolute -top-1.5 -right-2 text-[8px] font-bold bg-destructive text-destructive-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {badgeCount}
              </span>
            </span>
          ) : (
            <span className="text-[10px]">•</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" side="right">
        <div className="space-y-4">
          <h4 className="font-semibold text-xs text-primary">
            Marcadores — {studentName || "Alumno"}
          </h4>

          {/* Repeater */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="repeater"
              checked={!!markers.repeater}
              onCheckedChange={toggleRepeater}
            />
            <Label htmlFor="repeater" className="text-xs cursor-pointer">
              Alumno repetidor
            </Label>
          </div>

          {/* Failed subjects */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Áreas suspensas</Label>
            {(markers.failedSubjects || []).map(fs => (
              <div key={fs.areaId} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                <span className="text-xs flex-1 truncate">{fs.areaName}</span>
                <Select
                  value={fs.level}
                  onValueChange={(v) => updateFailedLevel(fs.areaId, v as "insuficiente" | "muy_insuficiente")}
                >
                  <SelectTrigger className="h-6 text-[10px] w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insuficiente">Insuficiente</SelectItem>
                    <SelectItem value="muy_insuficiente">Muy insuficiente</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => removeFailedSubject(fs.areaId)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Select onValueChange={addFailedSubject}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="+ Añadir área suspensa" />
              </SelectTrigger>
              <SelectContent>
                {areas
                  .filter(a => !(markers.failedSubjects || []).some(f => f.areaId === a.id))
                  .map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deficit */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Déficit</Label>
            {(markers.deficit || []).map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                <span className="text-xs flex-1 truncate">{d.type}</span>
                <button onClick={() => removeDeficit(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={newDeficit}
                onChange={e => setNewDeficit(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addDeficit()}
                placeholder="Tipo de déficit..."
                className="h-7 text-xs"
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={addDeficit}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
