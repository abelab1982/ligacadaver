import { Header } from "@/components/Header";
import { TopScorersTable } from "@/components/TopScorersTable";

const GoleadoresPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          Tabla de <span className="text-primary">Goleadores</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Liga 1 — Temporada 2026</p>
        <TopScorersTable />
      </main>
    </div>
  );
};

export default GoleadoresPage;
