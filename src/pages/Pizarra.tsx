import { TacticalBoard } from "@/components/pizarra/TacticalBoard";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { staticRoutes } from "@/data/seoRoutes.mjs";

const route = staticRoutes.find((r) => r.path === "/pizarra");

const Pizarra = () => {
  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <Seo title={route.title} description={route.description} path="/pizarra" />
      <Header />
      <h1 className="sr-only">Pizarra táctica de fútbol: arma tu once de la Liga 1 2026</h1>
      <div className="flex-1 overflow-hidden">
        <TacticalBoard />
      </div>
    </div>
  );
};

export default Pizarra;
