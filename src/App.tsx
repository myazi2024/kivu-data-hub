import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from '@/hooks/useCart';
import { CadastralCartProvider } from '@/hooks/useCadastralCart';
import { CookieProvider } from "@/hooks/useCookies";
import CookieBanner from "@/components/CookieBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CartButton } from '@/components/cart/CartButton';
import { TestEnvironmentProvider } from '@/hooks/useTestEnvironment';
import TestEnvironmentBanner from '@/components/TestEnvironmentBanner';
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eagerly loaded pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

// Lazy loaded pages
const Publications = React.lazy(() => import("./pages/Publications"));
const Map = React.lazy(() => import("./pages/Map"));
const CadastralMap = React.lazy(() => import("./pages/CadastralMap"));
const Admin = React.lazy(() => import("./pages/Admin"));


const UserDashboard = React.lazy(() => import("./pages/UserDashboard"));
const ResellerDashboard = React.lazy(() => import("./pages/ResellerDashboard"));
const About = React.lazy(() => import("./pages/About"));
const Services = React.lazy(() => import("./pages/Services"));

const Partnership = React.lazy(() => import("./pages/Partnership"));
const Legal = React.lazy(() => import("./pages/Legal"));
const Articles = React.lazy(() => import("./pages/Articles"));
const ArticleDetail = React.lazy(() => import("./pages/ArticleDetail"));
const AboutCCC = React.lazy(() => import("./pages/AboutCCC"));
const AboutDiscountCodes = React.lazy(() => import("./pages/AboutDiscountCodes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-dvh flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <CookieProvider>
        <AuthProvider>
          <CartProvider>
            <CadastralCartProvider>
              <TooltipProvider>
              <TestEnvironmentProvider>
              <Toaster />
              <Sonner />
              <TestEnvironmentBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/publications" element={<Publications />} />
                  <Route path="/map" element={<Map />} />
                  <Route path="/cadastral-map" element={<CadastralMap />} />
                  <Route path="/admin" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  <Route path="/mon-compte" element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/user-dashboard" element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/reseller" element={
                    <ProtectedRoute requiredRoles={['partner', 'admin', 'super_admin']}>
                      <ResellerDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  
                  <Route path="/partnership" element={<Partnership />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/articles" element={<Articles />} />
                  <Route path="/articles/:slug" element={<ArticleDetail />} />
                  <Route path="/about-ccc" element={<AboutCCC />} />
                  <Route path="/about-discount-codes" element={<AboutDiscountCodes />} />

                  {/* Test environment mirror routes */}
                  <Route path="/test/map" element={<Map />} />
                  <Route path="/test/cadastral-map" element={<CadastralMap />} />
                  <Route path="/test/mon-compte" element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              {/* Global floating cart button */}
              <CartButton />
              <CookieBanner />
              </TestEnvironmentProvider>
              </TooltipProvider>
            </CadastralCartProvider>
          </CartProvider>
        </AuthProvider>
      </CookieProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
