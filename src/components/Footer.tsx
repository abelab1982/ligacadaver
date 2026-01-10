import yapeQr from "@/assets/yape-qr.jpeg";

interface FooterProps {
  minimal?: boolean;
}

export const Footer = ({ minimal = false }: FooterProps) => {
  if (minimal) {
    return (
      <footer className="w-full bg-card/50 border-t border-border py-4 px-4">
        <p className="text-xs text-muted-foreground text-center">
          Creado por <span className="font-medium text-foreground">Digital Trendy</span>
        </p>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-card/50 border-t border-border py-6 px-4">
      <div className="max-w-md mx-auto text-center space-y-3">
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
        
        <p className="text-sm text-muted-foreground">
          ¿Te gustó la calculadora? Invítame un café para seguir mejorando la app ☕⚽
        </p>
        
        <div className="pt-3">
          <img 
            src={yapeQr} 
            alt="QR Yape para donaciones" 
            className="w-48 h-48 mx-auto rounded-lg shadow-md"
          />
        </div>
      </div>
    </footer>
  );
};
