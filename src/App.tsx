import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MfaGuardProvider } from "@/components/auth/MfaGuardProvider";
import { CartProvider } from '@/hooks/useCart';
import { CadastralCartProvider } from '@/hooks/useCadastralCart';
import { CookieProvider } from "@/hooks/useCookies";
import CookieBanner from "@/components/CookieBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandDataAccessGate from "@/components/access/LandDataAccessGate";
import AdminMfaGate from "@/components/auth/AdminMfaGate";
import { CartButton } from '@/components/cart/CartButton';
import { TestEnvironmentProvider } from '@/hooks/useTestEnvironment';
import TestEnvironmentBanner from '@/components/TestEnvironmentBanner';
import TestEmptyStateBanner from '@/components/TestEmptyStateBanner';
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useAppAppearance } from "@/hooks/useAppAppearance";
import { Navigate } from "react-router-dom";
import useScrollToTop from "@/hooks/useScrollToTop";
import ScrollToTopButton from "@/components/ScrollToTopButton";

// Eagerly loaded pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

// Lazy loaded pages
const Publications = lazyWithRetry(() => import("./pages/Publications"));
const Map = lazyWithRetry(() => import("./pages/Map"));
const CadastralMap = lazyWithRetry(() => import("./pages/CadastralMap"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));


const UserDashboard = lazyWithRetry(() => import("./pages/UserDashboard"));
const ResellerDashboard = lazyWithRetry(() => import("./pages/ResellerDashboard"));
const About = lazyWithRetry(() => import("./pages/About"));
const Services = lazyWithRetry(() => import("./pages/Services"));

const Partnership = lazyWithRetry(() => import("./pages/Partnership"));
const Legal = lazyWithRetry(() => import("./pages/Legal"));
const Articles = lazyWithRetry(() => import("./pages/Articles"));
const ArticleDetail = lazyWithRetry(() => import("./pages/ArticleDetail"));
const AboutCCC = lazyWithRetry(() => import("./pages/AboutCCC"));
const AboutDiscountCodes = lazyWithRetry(() => import("./pages/AboutDiscountCodes"));
const VerifyDocument = lazyWithRetry(() => import("./pages/VerifyDocument"));
const PitchPartenaires = lazyWithRetry(() => import("./pages/PitchPartenaires"));
const HrMe = lazyWithRetry(() => import("./pages/HrMe"));

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

const AppearanceLoader = () => {
  useAppAppearance();
  return null;
};

const ScrollToTopOnRouteChange = () => {
  useScrollToTop();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CookieProvider>
        <AuthProvider>
          <MfaGuardProvider>
          <CartProvider>
            <CadastralCartProvider>
              <TooltipProvider>
              <TestEnvironmentProvider>
              <Toaster />
              <Sonner />
              <AppearanceLoader />
              <ScrollToTopOnRouteChange />
              <TestEnvironmentBanner />
              <TestEmptyStateBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/publications" element={<Publications />} />
                  <Route path="/map" element={
                    <LandDataAccessGate>
                      <Map />
                    </LandDataAccessGate>
                  } />
                  <Route path="/cadastral-map" element={
                    <ProtectedRoute>
                      <CadastralMap />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <AdminMfaGate>
                        <Admin />
                      </AdminMfaGate>
                    </ProtectedRoute>
                  } />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  <Route path="/mon-compte" element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/user-dashboard" element={<Navigate to="/mon-compte" replace />} />
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
                  <Route path="/discount-codes" element={<Navigate to="/about-discount-codes" replace />} />
                  <Route path="/verify/:code?" element={<VerifyDocument />} />
                  <Route path="/pitch-partenaires" element={<PitchPartenaires />} />
                  <Route path="/hr/me" element={<ProtectedRoute><HrMe /></ProtectedRoute>} />

                  {/* Test environment mirror routes — admin only */}
                  <Route path="/test/map" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <Map />
                    </ProtectedRoute>
                  } />
                  <Route path="/test/cadastral-map" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <CadastralMap />
                    </ProtectedRoute>
                  } />
                  <Route path="/test/mon-compte" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              {/* Global floating cart button */}
              <CartButton />
              <ScrollToTopButton />
              <CookieBanner />
              </TestEnvironmentProvider>
              </TooltipProvider>
            </CadastralCartProvider>
          </CartProvider>
          </MfaGuardProvider>
        </AuthProvider>
      </CookieProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
