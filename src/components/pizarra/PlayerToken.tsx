import { motion, useDragControls } from "framer-motion";
import { useRef } from "react";

interface PlayerTokenProps {
  name: string;
  number?: number;
  role: string;
  x: number;
  y: number;
  color?: string;
  isSelected?: boolean;
  onDragEnd: (x: number, y: number) => void;
  onClick?: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const PlayerToken = ({
  name,
  number,
  role,
  x,
  y,
  color = "hsl(45, 93%, 47%)",
  isSelected = false,
  onDragEnd,
  onClick,
  containerRef,
}: PlayerTokenProps) => {
  const dragControls = useDragControls();
  const tokenRef = useRef<HTMLDivElement>(null);

  // Show last name only
  const parts = name.split(" ");
  const displayName = parts.length > 1 ? parts[parts.length - 1] : name;
  const shortName = displayName.length > 8 ? displayName.substring(0, 7) + "…" : displayName;

  return (
    <motion.div
      ref={tokenRef}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onDragEnd={() => {
        if (!containerRef.current || !tokenRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const tokenRect = tokenRef.current.getBoundingClientRect();
        const centerX = tokenRect.left + tokenRect.width / 2 - rect.left;
        const centerY = tokenRect.top + tokenRect.height / 2 - rect.top;
        const newX = Math.max(0, Math.min(100, (centerX / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, (centerY / rect.height) * 100));
        onDragEnd(newX, newY);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing z-10 touch-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      whileTap={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Jersey shape */}
      <div
        className={`relative w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center font-bold shadow-xl border-2 transition-all ${
          isSelected
            ? "border-white ring-2 ring-white/60 scale-110"
            : "border-white/20"
        }`}
        style={{
          backgroundColor: color,
          color: "#111",
          boxShadow: isSelected
            ? "0 0 16px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.5)"
            : "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <span className="text-xs md:text-sm font-extrabold leading-none">
          {number ?? role}
        </span>
      </div>
      {/* Name plate */}
      <div
        className="mt-0.5 px-1.5 py-px rounded-sm"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      >
        <span className="text-[8px] md:text-[10px] font-semibold text-white leading-tight text-center whitespace-nowrap">
          {shortName}
        </span>
      </div>
    </motion.div>
  );
};
