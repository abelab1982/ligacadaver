import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/hooks/useFixtures";

interface MatchStatusBadgeProps {
  status: MatchStatus;
  className?: string;
}

export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  if (status === "NS") return null;

  const isLive = status === "LIVE";

  return (
    <Badge
      variant={isLive ? "destructive" : "secondary"}
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 font-bold",
        isLive && "animate-pulse",
        className
      )}
    >
      {isLive ? "EN VIVO" : "FINAL"}
    </Badge>
  );
}
