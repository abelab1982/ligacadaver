import { StandingsTable } from "@/components/StandingsTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        <StandingsTable />
        
        {/* Footer */}
        <footer className="mt-8 pb-6 text-center text-sm text-muted-foreground">
          <p>Ingresa PJ, G, E, P para calcular puntos • Toca ⚽ para editar goles</p>
          <p className="mt-2 opacity-60">Liga 1 Perú 2026 • 18 equipos</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
