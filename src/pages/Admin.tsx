import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader';

// Lazy-loaded admin components
const AdminDashboardOverview = lazy(() => import('@/components/admin/AdminDashboardOverview').then(m => ({ default: m.AdminDashboardOverview })));
const AdminPublications = lazy(() => import('@/components/admin/AdminPublications'));
const AdminPayments = lazy(() => import('@/components/admin/AdminPayments'));
const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard'));
const AdminUserRolesEnhanced = lazy(() => import('@/components/admin/AdminUserRolesEnhanced').then(m => ({ default: m.AdminUserRolesEnhanced })));
const AdminUsers = lazy(() => import('@/components/admin/AdminUsers'));
const AdminResellers = lazy(() => import('@/components/admin/AdminResellers'));
const AdminTerritorialZones = lazy(() => import('@/components/admin/AdminTerritorialZones'));
const AdminCadastralServices = lazy(() => import('@/components/admin/AdminCadastralServices'));
const AdminCatalogConfig = lazy(() => import('@/components/admin/AdminCatalogConfig'));
const AdminCadastralMap = lazy(() => import('@/components/admin/AdminCadastralMap'));
const AdminCadastralTooltip = lazy(() => import('@/components/admin/AdminCadastralTooltip'));
const AdminCCCContributions = lazy(() => import('@/components/admin/AdminCCCContributions'));
const AdminValidation = lazy(() => import('@/components/admin/AdminValidation'));
const AdminNotifications = lazy(() => import('@/components/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminSearchBarConfig = lazy(() => import('@/components/admin/AdminSearchBarConfig'));
const AdminResultsConfig = lazy(() => import('@/components/admin/AdminResultsConfig'));
const AdminContributionConfig = lazy(() => import('@/components/admin/AdminContributionConfig'));
const AdminCCCCodes = lazy(() => import('@/components/admin/AdminCCCCodes'));
const AdminAuditLogs = lazy(() => import('@/components/admin/AdminAuditLogs'));
const AdminArticles = lazy(() => import('@/components/admin/AdminArticles'));
const AdminArticleThemes = lazy(() => import('@/components/admin/AdminArticleThemes'));
const AdminFraudDetection = lazy(() => import('@/components/admin/AdminFraudDetection'));
const AdminInvoices = lazy(() => import('@/components/admin/AdminInvoices'));
const AdminFinancialDashboard = lazy(() => import('@/components/admin/AdminFinancialDashboard'));
const AdminTransactions = lazy(() => import('@/components/admin/AdminTransactions'));
const AdminCommissions = lazy(() => import('@/components/admin/AdminCommissions'));
const AdminDiscountCodes = lazy(() => import('@/components/admin/AdminDiscountCodes'));
const AdminBuildingPermits = lazy(() => import('@/components/admin/AdminBuildingPermits'));
const AdminPermitFeesConfig = lazy(() => import('@/components/admin/AdminPermitFeesConfig'));
const AdminPaymentMethods = lazy(() => import('@/components/admin/AdminPaymentMethods'));
const AdminPaymentMode = lazy(() => import('@/components/admin/AdminPaymentMode'));
const AdminBillingConfig = lazy(() => import('@/components/admin/AdminBillingConfig'));
const AdminPaymentMonitoring = lazy(() => import('@/components/admin/AdminPaymentMonitoring').then(m => ({ default: m.AdminPaymentMonitoring })));
const AdminPaymentServiceIntegration = lazy(() => import('@/components/admin/AdminPaymentServiceIntegration'));
const AdminTestMode = lazy(() => import('@/components/admin/AdminTestMode'));
const AdminMutationRequests = lazy(() => import('@/components/admin/AdminMutationRequests'));
const AdminExpertiseRequests = lazy(() => import('@/components/admin/AdminExpertiseRequests'));
const AdminExpertiseFeesConfig = lazy(() => import('@/components/admin/AdminExpertiseFeesConfig'));
const AdminMutationFeesConfig = lazy(() => import('@/components/admin/AdminMutationFeesConfig'));
const AdminCurrencyConfig = lazy(() => import('@/components/admin/AdminCurrencyConfig'));
const AdminMortgages = lazy(() => import('@/components/admin/AdminMortgages'));
const AdminTaxHistory = lazy(() => import('@/components/admin/AdminTaxHistory'));
const AdminTaxDeclarations = lazy(() => import('@/components/admin/AdminTaxDeclarations'));
const AdminOwnershipHistory = lazy(() => import('@/components/admin/AdminOwnershipHistory'));
const AdminBoundaryHistory = lazy(() => import('@/components/admin/AdminBoundaryHistory'));
const AdminCCCUsage = lazy(() => import('@/components/admin/AdminCCCUsage'));
const AdminPaymentReconciliation = lazy(() => import('@/components/admin/AdminPaymentReconciliation'));
const AdminResellerCommissions = lazy(() => import('@/components/admin/AdminResellerCommissions'));
const AdminSystemHealth = lazy(() => import('@/components/admin/AdminSystemHealth'));
const AdminLandTitleRequests = lazy(() => import('@/components/admin/AdminLandTitleRequests'));
const AdminPermissions = lazy(() => import('@/components/admin/AdminPermissions').then(m => ({ default: m.AdminPermissions })));
const AdminSubdivisionRequests = lazy(() => import('@/components/admin/AdminSubdivisionRequests'));
const AdminParcelActionsConfig = lazy(() => import('@/components/admin/AdminParcelActionsConfig'));
const AdminLandDisputes = lazy(() => import('@/components/admin/AdminLandDisputes'));
const AdminDisputeAnalytics = lazy(() => import('@/components/admin/AdminDisputeAnalytics'));
const AdminCertificates = lazy(() => import('@/components/admin/AdminCertificates'));
const AdminMapProviders = lazy(() => import('@/components/admin/AdminMapProviders'));
const AdminAnalyticsChartsConfig = lazy(() => import('@/components/admin/AdminAnalyticsChartsConfig'));
const AdminSubdivisionFeesConfig = lazy(() => import('@/components/admin/AdminSubdivisionFeesConfig'));
const AdminPartners = lazy(() => import('@/components/admin/AdminPartners'));

const LazyFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Generic hook for pending counts
const usePendingCount = (table: string, filter: Record<string, any>, enabled: boolean) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!enabled) return;
    const fetchCount = async () => {
      try {
        let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
        if (filter.in) {
          for (const [col, vals] of Object.entries(filter.in)) {
            query = query.in(col, vals as string[]);
          }
        }
        if (filter.eq) {
          for (const [col, val] of Object.entries(filter.eq)) {
            query = query.eq(col, val);
          }
        }
        if (filter.not) {
          for (const [col, op, val] of filter.not as [string, string, any][]) {
            query = query.not(col, op, val);
          }
        }
        const { count: c, error } = await query;
        if (!error) setCount(c || 0);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
  }, [enabled, table]);

  return count;
};

const Admin = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);

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

  const pendingCount = usePendingCount('cadastral_contributions', { in: { status: ['pending', 'under_review'] } }, isAdmin);
  const pendingLandTitleCount = usePendingCount('land_title_requests', { in: { status: ['pending', 'in_review'] } }, isAdmin);
  const pendingPermitsCount = usePendingCount('cadastral_contributions', { not: [['permit_request_data', 'is', null]], eq: { status: 'pending' } }, isAdmin);
  const pendingMutationsCount = usePendingCount('mutation_requests', { eq: { status: 'pending' } }, isAdmin);
  const pendingExpertiseCount = usePendingCount('real_estate_expertise_requests', { eq: { status: 'pending' } }, isAdmin);
  const pendingSubdivisionsCount = usePendingCount('subdivision_requests', { eq: { status: 'pending' } }, isAdmin);
  const pendingPaymentsCount = usePendingCount('payments', { eq: { status: 'pending' } }, isAdmin);
  const pendingDisputesCount = usePendingCount('cadastral_land_disputes', { in: { current_status: ['pending', 'under_investigation'] } }, isAdmin);
  const pendingMortgagesCount = usePendingCount('cadastral_mortgages', { eq: { mortgage_status: 'pending' } }, isAdmin);

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

  const refreshCounts = () => {
    // Counts auto-refresh on mount via usePendingCount
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboardOverview />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'users': return <AdminUsers onRefresh={refreshCounts} />;
      case 'roles': return <AdminUserRolesEnhanced />;
      case 'permissions': return <AdminPermissions />;
      case 'fraud': return <AdminFraudDetection />;
      case 'ccc': return <AdminCCCContributions />;
      case 'validation': return <AdminValidation />;
      case 'ccc-codes': return <AdminCCCCodes />;
      case 'contribution-config': return <AdminContributionConfig />;
      case 'payments': return <AdminPayments onRefresh={refreshCounts} />;
      case 'payment-methods': return <AdminPaymentMethods />;
      case 'payment-mode': return <AdminPaymentMode />;
      case 'payment-monitoring': return <AdminPaymentMonitoring />;
      case 'payment-integration': return <AdminPaymentServiceIntegration />;
      case 'test-mode': return <AdminTestMode />;
      case 'billing-config': return <AdminBillingConfig />;
      case 'currency-config': return <AdminCurrencyConfig />;
      case 'invoices': return <AdminInvoices />;
      case 'financial': return <AdminFinancialDashboard />;
      case 'transactions': return <AdminTransactions />;
      case 'commissions': return <AdminCommissions />;
      case 'resellers': return <AdminResellers />;
      case 'discount-codes': return <AdminDiscountCodes />;
      case 'services': return <AdminCadastralServices />;
      case 'catalog-config': return <AdminCatalogConfig />;
      case 'cadastral-map': return <AdminCadastralMap />;
      case 'map-providers': return <AdminMapProviders />;
      case 'cadastral-tooltip': return <AdminCadastralTooltip />;
      case 'search-config': return <AdminSearchBarConfig />;
      case 'results-config': return <AdminResultsConfig />;
      case 'zones': return <AdminTerritorialZones />;
      case 'permits': return <AdminBuildingPermits />;
      case 'land-title-requests': return <AdminLandTitleRequests />;
      case 'mutations': return <AdminMutationRequests />;
      case 'subdivision-requests': return <AdminSubdivisionRequests />;
      case 'subdivision-fees-config': return <AdminSubdivisionFeesConfig />;
      case 'expertise-requests': return <AdminExpertiseRequests />;
      case 'expertise-fees-config': return <AdminExpertiseFeesConfig />;
      case 'permit-fees-config': return <AdminPermitFeesConfig />;
      case 'mutation-fees-config': return <AdminMutationFeesConfig />;
      case 'mortgages': return <AdminMortgages />;
      case 'tax-history': return <AdminTaxHistory />;
      case 'tax-declarations': return <AdminTaxDeclarations />;
      case 'ownership-history': return <AdminOwnershipHistory />;
      case 'boundary-history': return <AdminBoundaryHistory />;
      case 'ccc-usage': return <AdminCCCUsage />;
      case 'payment-reconciliation': return <AdminPaymentReconciliation />;
      case 'reseller-commissions': return <AdminResellerCommissions />;
      case 'system-health': return <AdminSystemHealth />;
      case 'publications': return <AdminPublications onRefresh={refreshCounts} />;
      case 'articles': return <AdminArticles />;
      case 'article-themes': return <AdminArticleThemes />;
      case 'notifications': return <AdminNotifications />;
      case 'parcel-actions-config': return <AdminParcelActionsConfig />;
      case 'land-disputes': return <AdminLandDisputes />;
      case 'dispute-analytics': return <AdminDisputeAnalytics />;
      case 'certificates': return <AdminCertificates />;
      case 'analytics-charts-config': return <AdminAnalyticsChartsConfig />;
      case 'partners': return <AdminPartners />;
      case 'audit-logs': return <AdminAuditLogs />;
      default: return <AdminDashboardOverview />;
      default: return <AdminDashboardOverview />;
    }
  };

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
            <Suspense fallback={<LazyFallback />}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
