import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GTMPageViewTracker } from "@/components/GTMPageViewTracker";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import AdminPage from "./pages/Admin";
import PizarraPage from "./pages/Pizarra";
import GoleadoresPage from "./pages/Goleadores";
import TeamPage from "./pages/TeamPage";

const queryClient = new QueryClient();

// Wrapper that adds AuthProvider only for routes that need it
const WithAuth = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GTMPageViewTracker />
        <Routes>
          {/* Public routes - NO AuthProvider, no Supabase auth interference */}
          <Route path="/" element={<Index />} />
          <Route path="/pizarra" element={<PizarraPage />} />
          <Route path="/goleadores" element={<GoleadoresPage />} />
          <Route path="/equipos/:slug" element={<TeamPage />} />

          {/* Auth routes - wrapped with AuthProvider */}
          <Route path="/login" element={<WithAuth><LoginPage /></WithAuth>} />
          <Route path="/registro" element={<WithAuth><RegisterPage /></WithAuth>} />
          <Route path="/admin" element={<WithAuth><AdminPage /></WithAuth>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
