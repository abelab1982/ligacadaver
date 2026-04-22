import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GTMPageViewTracker } from "@/components/GTMPageViewTracker";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";

// Lazy load non-critical routes (code splitting)
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const AdminPage = lazy(() => import("./pages/Admin"));
const PizarraPage = lazy(() => import("./pages/Pizarra"));
const GoleadoresPage = lazy(() => import("./pages/Goleadores"));
const TeamPage = lazy(() => import("./pages/TeamPage"));

const queryClient = new QueryClient();

// Wrapper that adds AuthProvider only for routes that need it
const WithAuth = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="h-full bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GTMPageViewTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Main route - eagerly loaded for best FCP */}
            <Route path="/" element={<Index />} />

            {/* Public routes - lazy loaded */}
            <Route path="/pizarra" element={<PizarraPage />} />
            <Route path="/goleadores" element={<GoleadoresPage />} />
            <Route path="/equipos/:slug" element={<TeamPage />} />

            {/* Auth routes - lazy loaded + wrapped with AuthProvider */}
            <Route path="/login" element={<WithAuth><LoginPage /></WithAuth>} />
            <Route path="/registro" element={<WithAuth><RegisterPage /></WithAuth>} />
            <Route path="/admin" element={<WithAuth><AdminPage /></WithAuth>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
