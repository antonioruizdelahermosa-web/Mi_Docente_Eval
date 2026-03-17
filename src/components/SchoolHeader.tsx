import { useRef } from "react";
import { Upload } from "lucide-react";

interface SchoolHeaderProps {
  centerName: string;
  setCenterName: (v: string) => void;
  level: string;
  setLevel: (v: string) => void;
  course: string;
  setCourse: (v: string) => void;
  schoolYear: string;
  setSchoolYear: (v: string) => void;
  logo: string;
  setLogo: (v: string) => void;
}

export default function SchoolHeader({
  centerName, setCenterName,
  level, setLevel,
  course, setCourse,
  schoolYear, setSchoolYear,
  logo, setLogo,
}: SchoolHeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500_000) {
        // Compress large images by resizing
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
          setLogo(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => setLogo(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="rounded-xl bg-primary p-6 shadow-card">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Logo */}
        <div
          className="flex-shrink-0 cursor-pointer group"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          {logo ? (
            <img src={logo} alt="Logo del centro" className="h-20 w-20 rounded-xl object-contain bg-white p-1" />
          ) : (
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-primary-foreground/40 flex flex-col items-center justify-center gap-1 group-hover:border-primary-foreground/70 transition-colors">
              <Upload className="h-5 w-5 text-primary-foreground/60" />
              <span className="text-[10px] text-primary-foreground/60">Logo</span>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="flex-1 space-y-2 w-full">
          <input
            type="text"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            className="w-full bg-transparent text-2xl font-display font-bold text-primary-foreground outline-none placeholder:text-primary-foreground/50 border-b border-primary-foreground/20 pb-1"
            placeholder="Nombre del centro"
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary-foreground/70 font-medium">Nivel:</span>
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="bg-transparent text-primary-foreground outline-none border-b border-primary-foreground/20 text-sm w-28 placeholder:text-primary-foreground/40"
                placeholder="Ej: Primaria"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary-foreground/70 font-medium">Curso:</span>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="bg-transparent text-primary-foreground outline-none border-b border-primary-foreground/20 text-sm w-20 placeholder:text-primary-foreground/40"
                placeholder="Ej: 3ºA"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary-foreground/70 font-medium">Año:</span>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="bg-transparent text-primary-foreground outline-none border-b border-primary-foreground/20 text-sm w-28 placeholder:text-primary-foreground/40"
                placeholder="Ej: 2025-2026"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
