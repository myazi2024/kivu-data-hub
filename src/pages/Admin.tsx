import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AdminSidebar, getTabLabel, getTabCategory } from '@/components/admin/AdminSidebar';
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader';
import { usePendingCount } from '@/hooks/usePendingCount';
import { ChevronRight } from 'lucide-react';

// Lazy-loaded admin components — object mapping
const tabComponents: Record<string, React.LazyExoticComponent<any>> = {
  'dashboard': lazy(() => import('@/components/admin/AdminDashboardOverview').then(m => ({ default: m.AdminDashboardOverview }))),
  'analytics': lazy(() => import('@/components/analytics/AnalyticsDashboard')),
  'analytics-charts-config': lazy(() => import('@/components/admin/AdminAnalyticsChartsConfig')),
  'users': lazy(() => import('@/components/admin/AdminUsers')),
  'roles': lazy(() => import('@/components/admin/AdminUserRolesEnhanced').then(m => ({ default: m.AdminUserRolesEnhanced }))),
  'permissions': lazy(() => import('@/components/admin/AdminPermissions').then(m => ({ default: m.AdminPermissions }))),
  'fraud': lazy(() => import('@/components/admin/AdminFraudDetection')),
  'ccc': lazy(() => import('@/components/admin/AdminCCCContributions')),
  'validation': lazy(() => import('@/components/admin/AdminValidation')),
  'ccc-codes': lazy(() => import('@/components/admin/AdminCCCCodes')),
  'ccc-usage': lazy(() => import('@/components/admin/AdminCCCUsage')),
  'contribution-config': lazy(() => import('@/components/admin/AdminContributionConfig')),
  'financial': lazy(() => import('@/components/admin/AdminFinancialDashboard')),
  'payments': lazy(() => import('@/components/admin/AdminPayments')),
  'payment-reconciliation': lazy(() => import('@/components/admin/AdminPaymentReconciliation')),
  'payment-methods': lazy(() => import('@/components/admin/AdminPaymentMethods')),
  'payment-mode': lazy(() => import('@/components/admin/AdminPaymentMode')),
  'payment-integration': lazy(() => import('@/components/admin/AdminPaymentServiceIntegration')),
  'payment-monitoring': lazy(() => import('@/components/admin/AdminPaymentMonitoring').then(m => ({ default: m.AdminPaymentMonitoring }))),
  'billing-config': lazy(() => import('@/components/admin/AdminBillingConfig')),
  'currency-config': lazy(() => import('@/components/admin/AdminCurrencyConfig')),
  'invoices': lazy(() => import('@/components/admin/AdminInvoices')),
  'transactions': lazy(() => import('@/components/admin/AdminTransactions')),
  'commissions': lazy(() => import('@/components/admin/AdminCommissions')),
  'reseller-commissions': lazy(() => import('@/components/admin/AdminResellerCommissions')),
  'reseller-sales': lazy(() => import('@/components/admin/AdminResellerSales')),
  'unified-payments': lazy(() => import('@/components/admin/AdminUnifiedPayments')),
  'resellers': lazy(() => import('@/components/admin/AdminResellers')),
  'discount-codes': lazy(() => import('@/components/admin/AdminDiscountCodes')),
  'cadastral-map': lazy(() => import('@/components/admin/AdminCadastralMap')),
  'map-providers': lazy(() => import('@/components/admin/AdminMapProviders')),
  'services': lazy(() => import('@/components/admin/AdminCadastralServices')),
  'catalog-config': lazy(() => import('@/components/admin/AdminCatalogConfig')),
  'cadastral-tooltip': lazy(() => import('@/components/admin/AdminCadastralTooltip')),
  'map-legend': lazy(() => import('@/components/admin/AdminContributionConfig')),
  'search-config': lazy(() => import('@/components/admin/AdminSearchBarConfig')),
  'results-config': lazy(() => import('@/components/admin/AdminResultsConfig')),
  'zones': lazy(() => import('@/components/admin/AdminTerritorialZones')),
  'config-hub': lazy(() => import('@/components/admin/AdminConfigHub')),
  'requests-hub': lazy(() => import('@/components/admin/AdminRequestsHub')),
  'history-hub': lazy(() => import('@/components/admin/AdminHistoryHub')),
  'permits': lazy(() => import('@/components/admin/AdminBuildingPermits')),
  'permit-fees-config': lazy(() => import('@/components/admin/AdminPermitFeesConfig')),
  'land-title-requests': lazy(() => import('@/components/admin/AdminLandTitleRequests')),
  'mutations': lazy(() => import('@/components/admin/AdminMutationRequests')),
  'mutation-fees-config': lazy(() => import('@/components/admin/AdminMutationFeesConfig')),
  'subdivision-requests': lazy(() => import('@/components/admin/AdminSubdivisionRequests')),
  'subdivision-fees-config': lazy(() => import('@/components/admin/AdminSubdivisionFeesConfig')),
  'expertise-requests': lazy(() => import('@/components/admin/AdminExpertiseRequests')),
  'expertise-fees-config': lazy(() => import('@/components/admin/AdminExpertiseFeesConfig')),
  'certificates': lazy(() => import('@/components/admin/AdminCertificates')),
  'land-disputes': lazy(() => import('@/components/admin/AdminLandDisputes')),
  'dispute-analytics': lazy(() => import('@/components/admin/AdminDisputeAnalytics')),
  'mortgages': lazy(() => import('@/components/admin/AdminMortgages')),
  'tax-history': lazy(() => import('@/components/admin/AdminTaxHistory')),
  'tax-declarations': lazy(() => import('@/components/admin/AdminTaxDeclarations')),
  'ownership-history': lazy(() => import('@/components/admin/AdminOwnershipHistory')),
  'boundary-history': lazy(() => import('@/components/admin/AdminBoundaryHistory')),
  'partners': lazy(() => import('@/components/admin/AdminPartners')),
  'pitch-config': lazy(() => import('@/components/admin/AdminPitchConfig')),
  'publications': lazy(() => import('@/components/admin/AdminPublications')),
  'articles': lazy(() => import('@/components/admin/AdminArticles')),
  'article-themes': lazy(() => import('@/components/admin/AdminArticleThemes')),
  'content-hub': lazy(() => import('@/components/admin/AdminContentHub')),
  'publication-categories': lazy(() => import('@/components/admin/AdminPublicationCategories')),
  'notifications': lazy(() => import('@/components/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications }))),
  'parcel-actions-config': lazy(() => import('@/components/admin/AdminParcelActionsConfig')),
  'test-mode': lazy(() => import('@/components/admin/AdminTestMode')),
  'audit-logs': lazy(() => import('@/components/admin/AdminAuditLogs')),
  'system-health': lazy(() => import('@/components/admin/AdminSystemHealth')),
  'appearance': lazy(() => import('@/components/admin/AdminAppearance')),
  'hr': lazy(() => import('@/components/admin/hr/AdminHR')),
  'system-hub': lazy(() => import('@/components/admin/AdminSystemHub')),
  'system-settings': lazy(() => import('@/components/admin/AdminSystemSettings')),
};

// Tabs that receive onRefresh prop
const REFRESHABLE_TABS = new Set(['users', 'payments', 'publications']);

// Special case: map-legend needs extra props
const getComponentProps = (tab: string, refreshCounts: () => void) => {
  if (REFRESHABLE_TABS.has(tab)) return { onRefresh: refreshCounts };
  if (tab === 'map-legend') return { initialTab: 'map', scrollToLegend: true };
  return {};
};

const LazyFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const Admin = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!user) { setHasAdminRole(false); return; }
      try {
        const { data, error } = await supabase
          .from('user_roles').select('role')
          .eq('user_id', user.id).in('role', ['admin', 'super_admin']);
        if (error) { setHasAdminRole(false); return; }
        setHasAdminRole(data && data.length > 0);
      } catch { setHasAdminRole(false); }
    };
    verifyAdminRole();
  }, [user]);

  const isAdmin = hasAdminRole === true;

  const pendingCount = usePendingCount('cadastral_contributions', { in: { status: ['pending', 'under_review'] } }, isAdmin, refreshKey);
  const pendingLandTitleCount = usePendingCount('land_title_requests', { in: { status: ['pending', 'in_review'] } }, isAdmin, refreshKey);
  const pendingPermitsCount = usePendingCount('cadastral_contributions', { not: [['permit_request_data', 'is', null]], eq: { status: 'pending' } }, isAdmin, refreshKey);
  const pendingMutationsCount = usePendingCount('mutation_requests', { eq: { status: 'pending' } }, isAdmin, refreshKey);
  const pendingExpertiseCount = usePendingCount('real_estate_expertise_requests', { eq: { status: 'pending' } }, isAdmin, refreshKey);
  const pendingSubdivisionsCount = usePendingCount('subdivision_requests', { eq: { status: 'pending' } }, isAdmin, refreshKey);
  const pendingPaymentsCount = usePendingCount('payments', { eq: { status: 'pending' } }, isAdmin, refreshKey);
  const pendingDisputesCount = usePendingCount('cadastral_land_disputes', { in: { current_status: ['pending', 'under_investigation'] } }, isAdmin, refreshKey);
  const pendingMortgagesCount = usePendingCount('cadastral_mortgages', { eq: { mortgage_status: 'pending' } }, isAdmin, refreshKey);

  const refreshCounts = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (loading || hasAdminRole === null) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAdminRole) {
    return <Navigate to="/auth" replace />;
  }

  const renderContent = () => {
    const Component = tabComponents[activeTab] || tabComponents['dashboard'];
    const props = getComponentProps(activeTab, refreshCounts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Component {...(props as any)} />;
  };

  const category = getTabCategory(activeTab);
  const label = getTabLabel(activeTab);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden md:flex w-52 lg:w-60 flex-col border-r bg-card/50 backdrop-blur-sm">
        <div className="p-3 lg:p-4 border-b bg-background/80">
          <h2 className="text-sm lg:text-base font-bold">Admin</h2>
          <p className="text-[10px] text-muted-foreground">Gestion complète</p>
        </div>
        <AdminSidebar 
          pendingCount={pendingCount} 
          pendingLandTitleCount={pendingLandTitleCount}
          pendingPermitsCount={pendingPermitsCount}
          pendingMutationsCount={pendingMutationsCount}
          pendingExpertiseCount={pendingExpertiseCount}
          pendingSubdivisionsCount={pendingSubdivisionsCount}
          pendingPaymentsCount={pendingPaymentsCount}
          pendingDisputesCount={pendingDisputesCount}
          pendingMortgagesCount={pendingMortgagesCount}
        />
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <div className="p-3 border-b bg-background">
            <h2 className="text-sm font-bold">Admin</h2>
            <p className="text-[10px] text-muted-foreground">Gestion complète</p>
          </div>
          <AdminSidebar 
            pendingCount={pendingCount}
            pendingLandTitleCount={pendingLandTitleCount}
            pendingPermitsCount={pendingPermitsCount}
            pendingMutationsCount={pendingMutationsCount}
            pendingExpertiseCount={pendingExpertiseCount}
            pendingSubdivisionsCount={pendingSubdivisionsCount}
            pendingPaymentsCount={pendingPaymentsCount}
            pendingDisputesCount={pendingDisputesCount}
            pendingMortgagesCount={pendingMortgagesCount}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminDashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4">
          <div className="max-w-[360px] mx-auto md:max-w-none">
            {/* Breadcrumb */}
            {activeTab !== 'dashboard' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <span>Admin</span>
                <ChevronRight className="h-3 w-3" />
                <span>{category}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{label}</span>
              </div>
            )}
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
