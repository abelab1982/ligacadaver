import { Header } from "@/components/Header";
import { TopScorersTable } from "@/components/TopScorersTable";
import { Seo } from "@/components/Seo";
import { staticRoutes } from "@/data/seoRoutes.mjs";

const route = staticRoutes.find((r) => r.path === "/goleadores");

const GoleadoresPage = () => {
  return (
    <div className="h-full overflow-y-auto bg-background flex flex-col">
      <Seo title={route.title} description={route.description} path="/goleadores" />
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
