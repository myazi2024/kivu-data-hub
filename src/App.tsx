import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from '@/hooks/useCart';
import { CookieProvider } from "@/hooks/useCookies";
import CookieBanner from "@/components/CookieBanner";
import { CartButton } from '@/components/cart/CartButton';
import Index from "./pages/Index";
import Publications from "./pages/Publications";
import Auth from "./pages/Auth";
import Map from "./pages/Map";
import Admin from "./pages/Admin";
import Myazi from "./pages/Myazi";
import JoinUs from "./pages/JoinUs";
import BillingDashboard from "./pages/BillingDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CookieProvider>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/publications" element={<Publications />} />
              <Route path="/map" element={<Map />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/myazi" element={<Myazi />} />
              <Route path="/careers" element={<JoinUs />} />
              <Route path="/billing" element={<BillingDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Global floating cart button */}
            <CartButton />
            <CookieBanner />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </CookieProvider>
  </QueryClientProvider>
);

export default App;
