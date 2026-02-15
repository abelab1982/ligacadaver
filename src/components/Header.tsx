import liga1Logo from "@/assets/liga1-logo.png";
import { Link, useLocation } from "react-router-dom";
import { PenTool, Trophy } from "lucide-react";

export const Header = () => {
  const location = useLocation();
  const isPizarra = location.pathname === "/pizarra";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src={liga1Logo} alt="Liga 1" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              Calculadora <span className="text-primary">Liga 1</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden md:block">Temporada 2026</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/goleadores"
            className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Goleadores</span>
          </Link>
          <Link
            to={isPizarra ? "/" : "/pizarra"}
            className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <PenTool className="w-4 h-4" />
            <span>{isPizarra ? "Calculadora" : "Pizarra"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
