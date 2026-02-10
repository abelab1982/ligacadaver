import { useRef, useState, useCallback, useEffect } from "react";

export type DrawingTool = "none" | "pencil" | "arrow";
export type DrawingColor = "#ffffff" | "#ffe600" | "#ff2d2d";

interface Stroke {
  tool: "pencil" | "arrow";
  color: string;
  points: { x: number; y: number }[];
}

interface DrawingCanvasProps {
  tool: DrawingTool;
  color: DrawingColor;
  onStrokeAdded: () => void;
  strokesRef: React.MutableRefObject<Stroke[]>;
  undoSignal: number;
  clearSignal: number;
}

export const DrawingCanvas = ({
  tool,
  color,
  onStrokeAdded,
  strokesRef,
  undoSignal,
  clearSignal,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<{ x: number; y: number }[]>([]);
  const [, forceRender] = useState(0);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    if (isDrawing.current && currentPoints.current.length > 0) {
      drawStroke(ctx, {
        tool: tool === "none" ? "pencil" : tool,
        color,
        points: currentPoints.current,
      });
    }
  }, [tool, color, strokesRef]);

  // Respond to undo/clear signals
  useEffect(() => {
    redraw();
  }, [undoSignal, clearSignal, redraw]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      redraw();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (tool === "none") return;
      e.preventDefault();
      isDrawing.current = true;
      currentPoints.current = [getPos(e)];
    },
    [tool, getPos]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || tool === "none") return;
      e.preventDefault();
      currentPoints.current.push(getPos(e));
      redraw();
    },
    [tool, getPos, redraw]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing.current || tool === "none") return;
    isDrawing.current = false;
    if (currentPoints.current.length > 1) {
      strokesRef.current.push({
        tool: tool as "pencil" | "arrow",
        color,
        points: [...currentPoints.current],
      });
      onStrokeAdded();
    }
    currentPoints.current = [];
    redraw();
    forceRender((n) => n + 1);
  }, [tool, color, strokesRef, onStrokeAdded, redraw]);

  const isActive = tool !== "none";

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: isActive ? 5 : 1,
        cursor: isActive
          ? tool === "pencil"
            ? "crosshair"
            : "cell"
          : "default",
        pointerEvents: isActive ? "auto" : "none",
        touchAction: isActive ? "none" : "auto",
      }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
};

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: { tool: string; color: string; points: { x: number; y: number }[] }
) {
  if (stroke.points.length < 2) return;

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85;

  if (stroke.tool === "pencil") {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (stroke.tool === "arrow") {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = 20;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export type { Stroke };
