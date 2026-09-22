import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { UserDashboardHeader } from '@/components/user/dashboard/UserDashboardHeader';
import { UserOverview } from '@/components/user/dashboard/UserOverview';
import { UserSidebar } from '@/components/user/dashboard/UserSidebar';
import {
  getUserTabCategory,
  getUserTabLabel,
  USER_TAB_ALIASES,
  USER_TAB_VALUES,
} from '@/components/user/dashboard/userDashboardConfig';
import { ChevronRight } from 'lucide-react';

const UserProfileSection = lazy(() => import('@/components/user/UserProfileSection'));
const UserContributions = lazy(() => import('@/components/user/UserContributions').then(module => ({ default: module.UserContributions })));
const RentalUnitsPanel = lazy(() => import('@/components/user/assets/RentalUnitsPanel').then(module => ({ default: module.RentalUnitsPanel })));
const ListingsPanel = lazy(() => import('@/components/user/assets/ListingsPanel').then(module => ({ default: module.ListingsPanel })));
const MarketValuePanel = lazy(() => import('@/components/user/assets/MarketValuePanel').then(module => ({ default: module.MarketValuePanel })));
const TaxObligationsPanel = lazy(() => import('@/components/user/finance/TaxObligationsPanel').then(module => ({ default: module.TaxObligationsPanel })));
const UserLandTitleRequests = lazy(() => import('@/components/user/UserLandTitleRequests').then(module => ({ default: module.UserLandTitleRequests })));
const UserBuildingPermits = lazy(() => import('@/components/user/UserBuildingPermits').then(module => ({ default: module.UserBuildingPermits })));
const UserExpertiseRequests = lazy(() => import('@/components/user/UserExpertiseRequests').then(module => ({ default: module.UserExpertiseRequests })));
const UserMutationRequests = lazy(() => import('@/components/user/UserMutationRequests').then(module => ({ default: module.UserMutationRequests })));
const UserMortgageRequests = lazy(() => import('@/components/user/UserMortgageRequests').then(module => ({ default: module.UserMortgageRequests })));
const UserSubdivisionRequests = lazy(() => import('@/components/user/UserSubdivisionRequests').then(module => ({ default: module.UserSubdivisionRequests })));
const UserLandDisputes = lazy(() => import('@/components/user/UserLandDisputes').then(module => ({ default: module.UserLandDisputes })));
const CadastralDashboardTabs = lazy(() => import('@/components/cadastral/CadastralDashboardTabs'));
const UserPreferences = lazy(() => import('@/components/user/UserPreferences').then(module => ({ default: module.UserPreferences })));
const UserAccountSecurity = lazy(() => import('@/components/user/UserAccountSecurity').then(module => ({ default: module.UserAccountSecurity })));
const UserDataControls = lazy(() => import('@/components/user/data/UserDataControls').then(module => ({ default: module.UserDataControls })));

const TAB_CONTENT: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  profile: UserProfileSection,
  contributions: UserContributions,
  rentals: RentalUnitsPanel,
  listings: ListingsPanel,
  'market-value': MarketValuePanel,
  titles: UserLandTitleRequests,
  permits: UserBuildingPermits,
  expertise: UserExpertiseRequests,
  mutations: UserMutationRequests,
  mortgages: UserMortgageRequests,
  subdivisions: UserSubdivisionRequests,
  disputes: UserLandDisputes,
  invoices: CadastralDashboardTabs,
  taxes: TaxObligationsPanel,
  preferences: UserPreferences,
  security: UserAccountSecurity,
  data: UserDataControls,
};

const DashboardFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
  </div>
);

const UserDashboard = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const requestedTab = searchParams.get('tab') || 'dashboard';
  const activeTab = USER_TAB_ALIASES[requestedTab] ?? (USER_TAB_VALUES.has(requestedTab) ? requestedTab : 'dashboard');

  useEffect(() => {
    const canonical = USER_TAB_ALIASES[requestedTab];
    if (canonical) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', canonical);
      setSearchParams(next, { replace: true });
    }
  }, [requestedTab, searchParams, setSearchParams]);

  const content = useMemo(() => {
    if (activeTab === 'dashboard') return <UserOverview />;
    const Component = TAB_CONTENT[activeTab];
    return Component ? <Component /> : <UserOverview />;
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Mon compte | BIC - Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Gérez votre compte BIC : contributions cadastrales, titres fonciers, expertises, mutations et paramètres." />
      </Helmet>
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside className="hidden w-52 flex-col border-r bg-card/50 md:flex lg:w-60">
          <UserSidebar activeTab={activeTab} />
        </aside>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <UserSidebar activeTab={activeTab} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <UserDashboardHeader title={getUserTabLabel(activeTab)} onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-3 md:p-4 lg:p-5">
            <div className="mx-auto w-full max-w-screen-2xl">
              {activeTab !== 'dashboard' && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Mon espace</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{getUserTabCategory(activeTab)}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-medium text-foreground">{getUserTabLabel(activeTab)}</span>
                </div>
              )}
              <ErrorBoundary>
                <Suspense fallback={<DashboardFallback />}>{content}</Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
