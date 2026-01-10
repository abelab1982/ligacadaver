import { Trophy } from "lucide-react";
export const Header = () => {
  return <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              Calculadora <span className="text-primary">Liga 1</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden md:block">Temporada 2026</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-muted-foreground"> Perú</span>
        </div>
      </div>
    </header>;
};