import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden",
        "min-h-[300px]",
        dragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-[hsl(var(--upload-border))] bg-[hsl(var(--upload-bg))] hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {preview ? (
        <>
          <img
            src={preview}
            alt="Uploaded preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />
          <button
            className="absolute top-3 right-3 p-1.5 bg-background/80 rounded-lg border border-border hover:bg-card transition-colors"
            onClick={clearPreview}
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
          <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-3 bg-background/70 rounded-xl backdrop-blur-sm">
            <ImageIcon className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">Photo ready — click Analyze!</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className={cn("p-5 rounded-full bg-muted transition-all", dragging && "animate-pulse-glow")}>
            <Upload className={cn("w-8 h-8 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Drop your photo here</p>
            <p className="text-sm text-muted-foreground">or click to browse · JPG, PNG, WEBP, HEIC</p>
          </div>
        </div>
      )}
    </div>
  );
}
