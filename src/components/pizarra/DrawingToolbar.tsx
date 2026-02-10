import { Pencil, MoveUpRight, Eraser, Trash2, X } from "lucide-react";
import type { DrawingTool, DrawingColor } from "./DrawingCanvas";

interface DrawingToolbarProps {
  tool: DrawingTool;
  color: DrawingColor;
  strokeCount: number;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: DrawingColor) => void;
  onUndo: () => void;
  onClear: () => void;
}

const COLORS: { value: DrawingColor; label: string; bg: string }[] = [
  { value: "#ffffff", label: "Blanco", bg: "bg-white" },
  { value: "#ffe600", label: "Amarillo", bg: "bg-yellow-400" },
  { value: "#ff2d2d", label: "Rojo", bg: "bg-red-500" },
];

export const DrawingToolbar = ({
  tool,
  color,
  strokeCount,
  onToolChange,
  onColorChange,
  onUndo,
  onClear,
}: DrawingToolbarProps) => {
  const isActive = tool !== "none";

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl">
      {/* Pencil */}
      <ToolButton
        active={tool === "pencil"}
        onClick={() => onToolChange(tool === "pencil" ? "none" : "pencil")}
        title="Lápiz libre"
      >
        <Pencil className="w-4 h-4" />
      </ToolButton>

      {/* Arrow */}
      <ToolButton
        active={tool === "arrow"}
        onClick={() => onToolChange(tool === "arrow" ? "none" : "arrow")}
        title="Flecha"
      >
        <MoveUpRight className="w-4 h-4" />
      </ToolButton>

      {/* Divider */}
      {isActive && (
        <>
          <div className="w-px h-5 bg-white/20 mx-0.5" />

          {/* Color picker */}
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              title={c.label}
              className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${
                color === c.value
                  ? "border-white scale-110 shadow-lg"
                  : "border-white/30 hover:border-white/60"
              }`}
            />
          ))}
        </>
      )}

      {/* Divider */}
      {strokeCount > 0 && <div className="w-px h-5 bg-white/20 mx-0.5" />}

      {/* Undo */}
      {strokeCount > 0 && (
        <ToolButton active={false} onClick={onUndo} title="Deshacer último trazo">
          <Eraser className="w-4 h-4" />
        </ToolButton>
      )}

      {/* Clear all */}
      {strokeCount > 0 && (
        <ToolButton active={false} onClick={onClear} title="Borrar todos los dibujos">
          <Trash2 className="w-4 h-4" />
        </ToolButton>
      )}

      {/* Close drawing mode */}
      {isActive && (
        <>
          <div className="w-px h-5 bg-white/20 mx-0.5" />
          <ToolButton
            active={false}
            onClick={() => onToolChange("none")}
            title="Cerrar herramientas"
          >
            <X className="w-4 h-4" />
          </ToolButton>
        </>
      )}
    </div>
  );
};

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-lg"
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
