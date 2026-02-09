import { motion, useDragControls } from "framer-motion";
import { useRef } from "react";

interface PlayerTokenProps {
  name: string;
  number?: number;
  role: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color?: string;
  onDragEnd: (x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const PlayerToken = ({
  name,
  number,
  role,
  x,
  y,
  color = "hsl(45, 93%, 47%)",
  onDragEnd,
  containerRef,
}: PlayerTokenProps) => {
  const dragControls = useDragControls();
  const tokenRef = useRef<HTMLDivElement>(null);

  const displayName = name.length > 10 ? name.substring(0, 9) + "…" : name;

  return (
    <motion.div
      ref={tokenRef}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onDragEnd={(_, info) => {
        if (!containerRef.current || !tokenRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const tokenRect = tokenRef.current.getBoundingClientRect();
        const centerX = tokenRect.left + tokenRect.width / 2 - rect.left;
        const centerY = tokenRect.top + tokenRect.height / 2 - rect.top;
        const newX = Math.max(0, Math.min(100, (centerX / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, (centerY / rect.height) * 100));
        onDragEnd(newX, newY);
      }}
      className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing z-10 touch-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      whileTap={{ scale: 1.15 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Circle */}
      <div
        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shadow-lg border-2 border-white/30"
        style={{ backgroundColor: color, color: "#111" }}
      >
        {number ?? role}
      </div>
      {/* Name label */}
      <span className="mt-0.5 text-[9px] md:text-[10px] font-semibold text-white leading-tight text-center max-w-[60px] truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {displayName}
      </span>
    </motion.div>
  );
};
