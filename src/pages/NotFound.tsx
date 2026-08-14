import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      {/* The SPA rewrite answers unknown paths with a 200, so tell crawlers explicitly. */}
      <Seo
        title="Página no encontrada | Liga 1 Calc"
        description="La página que buscas no existe. Vuelve a la calculadora de la Liga 1 2026."
        noindex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-muted-foreground">Esta página no existe</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Volver a la calculadora
        </a>
      </div>
    </div>
  );
};

export default NotFound;
