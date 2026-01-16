import { ExternalLink } from "lucide-react";
import yapeQr from "@/assets/yape-qr.jpeg";
import { trackDonateClick } from "@/lib/gtm";

interface FooterProps {
  minimal?: boolean;
}

const BetssonAffiliate = () => (
  <div className="flex flex-col items-center gap-1.5 py-3">
    <a
      href="https://record.betsson.com/_5ti98aEiuztCWYdW1nYrbGNd7ZgqdRLk/1/"
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
    >
      Regístrate y revisa las cuotas en Betsson
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
    <div className="text-center">
      <p className="text-[9px] text-muted-foreground/70 leading-tight">
        18+ | SFTG Limited | MINCETUR | Licencias: 11002586010000 y 21002586010000
      </p>
      <p className="text-[9px] text-muted-foreground/70">
        Juega con responsabilidad.
      </p>
    </div>
  </div>
);

export const Footer = ({ minimal = false }: FooterProps) => {
  const handleDonateClick = () => {
    trackDonateClick("footer");
  };

  if (minimal) {
    return (
      <footer className="w-full bg-card/50 border-t border-border py-4 px-4">
        <div className="flex flex-col items-center">
          <BetssonAffiliate />
          <p className="text-xs text-muted-foreground text-center">
            Creado por <span className="font-medium text-foreground">Digital Trendy</span>
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-card/50 border-t border-border py-6 px-4">
      <div className="max-w-md mx-auto text-center space-y-3">
        <BetssonAffiliate />
        
        <p className="text-xs text-muted-foreground">
          Creado por <span className="font-medium text-foreground">Digital Trendy</span>
        </p>
        
        <p className="text-xs text-muted-foreground">
          Sugerencias:{" "}
          <a 
            href="mailto:digital.trendy00@gmail.com"
            className="text-primary hover:underline"
          >
            digital.trendy00@gmail.com
          </a>
        </p>
        
        <p 
          className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={handleDonateClick}
        >
          ¿Te gustó la calculadora? Invítame un café para seguir mejorando la app ☕⚽
        </p>
        
        <div className="pt-3" onClick={handleDonateClick}>
          <img 
            src={yapeQr} 
            alt="QR Yape para donaciones" 
            className="w-48 h-48 mx-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          />
        </div>
      </div>
    </footer>
  );
};
