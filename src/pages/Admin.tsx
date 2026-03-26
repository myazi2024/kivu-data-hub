import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader';
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview';
import { toast } from 'sonner';
import AdminPublications from '@/components/admin/AdminPublications';
import AdminPayments from '@/components/admin/AdminPayments';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { AdminUserRolesEnhanced } from '@/components/admin/AdminUserRolesEnhanced';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminResellers from '@/components/admin/AdminResellers';
import AdminTerritorialZones from '@/components/admin/AdminTerritorialZones';
import AdminCadastralServices from '@/components/admin/AdminCadastralServices';
import AdminCatalogConfig from '@/components/admin/AdminCatalogConfig';
import AdminCadastralMap from '@/components/admin/AdminCadastralMap';
import AdminCadastralTooltip from '@/components/admin/AdminCadastralTooltip';
import AdminCCCContributions from '@/components/admin/AdminCCCContributions';
import AdminValidation from '@/components/admin/AdminValidation';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import AdminSearchBarConfig from '@/components/admin/AdminSearchBarConfig';
import AdminResultsConfig from '@/components/admin/AdminResultsConfig';
import AdminContributionConfig from '@/components/admin/AdminContributionConfig';
import AdminCCCCodes from '@/components/admin/AdminCCCCodes';
import AdminAuditLogs from '@/components/admin/AdminAuditLogs';
import AdminArticles from '@/components/admin/AdminArticles';
import AdminArticleThemes from '@/components/admin/AdminArticleThemes';
import AdminFraudDetection from '@/components/admin/AdminFraudDetection';
import AdminInvoices from '@/components/admin/AdminInvoices';
import AdminFinancialDashboard from '@/components/admin/AdminFinancialDashboard';
import AdminTransactions from '@/components/admin/AdminTransactions';
import AdminCommissions from '@/components/admin/AdminCommissions';
import AdminDiscountCodes from '@/components/admin/AdminDiscountCodes';
import AdminBuildingPermits from '@/components/admin/AdminBuildingPermits';
import AdminPermitFeesConfig from '@/components/admin/AdminPermitFeesConfig';
import AdminPaymentMethods from '@/components/admin/AdminPaymentMethods';
import AdminPaymentMode from '@/components/admin/AdminPaymentMode';
import AdminBillingConfig from '@/components/admin/AdminBillingConfig';
import { AdminPaymentMonitoring } from '@/components/admin/AdminPaymentMonitoring';
import AdminPaymentServiceIntegration from '@/components/admin/AdminPaymentServiceIntegration';
import AdminTestMode from '@/components/admin/AdminTestMode';
import AdminMutationRequests from '@/components/admin/AdminMutationRequests';
import AdminExpertiseRequests from '@/components/admin/AdminExpertiseRequests';
import AdminExpertiseFeesConfig from '@/components/admin/AdminExpertiseFeesConfig';
import AdminMutationFeesConfig from '@/components/admin/AdminMutationFeesConfig';

import AdminMortgages from '@/components/admin/AdminMortgages';
import AdminTaxHistory from '@/components/admin/AdminTaxHistory';
import AdminTaxDeclarations from '@/components/admin/AdminTaxDeclarations';
import AdminOwnershipHistory from '@/components/admin/AdminOwnershipHistory';
import AdminBoundaryHistory from '@/components/admin/AdminBoundaryHistory';
import AdminCCCUsage from '@/components/admin/AdminCCCUsage';
import AdminPaymentReconciliation from '@/components/admin/AdminPaymentReconciliation';
import AdminResellerCommissions from '@/components/admin/AdminResellerCommissions';
import AdminSystemHealth from '@/components/admin/AdminSystemHealth';
import AdminLandTitleRequests from '@/components/admin/AdminLandTitleRequests';
import { AdminPermissions } from '@/components/admin/AdminPermissions';
import AdminSubdivisionRequests from '@/components/admin/AdminSubdivisionRequests';
import AdminParcelActionsConfig from '@/components/admin/AdminParcelActionsConfig';
import AdminLandDisputes from '@/components/admin/AdminLandDisputes';
import AdminDisputeAnalytics from '@/components/admin/AdminDisputeAnalytics';
import AdminCertificates from '@/components/admin/AdminCertificates';
import AdminMapProviders from '@/components/admin/AdminMapProviders';
import AdminAnalyticsChartsConfig from '@/components/admin/AdminAnalyticsChartsConfig';
const Admin = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLandTitleCount, setPendingLandTitleCount] = useState(0);
  const [pendingPermitsCount, setPendingPermitsCount] = useState(0);
  const [pendingMutationsCount, setPendingMutationsCount] = useState(0);
  const [pendingExpertiseCount, setPendingExpertiseCount] = useState(0);
  const [pendingSubdivisionsCount, setPendingSubdivisionsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingDisputesCount, setPendingDisputesCount] = useState(0);
  const [pendingMortgagesCount, setPendingMortgagesCount] = useState(0);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);

  // Verify admin role from user_roles table
  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!user) {
        setHasAdminRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'super_admin']);

        if (error) {
          console.error('Error verifying admin role:', error);
          setHasAdminRole(false);
          return;
        }

        setHasAdminRole(data && data.length > 0);
      } catch (error) {
        console.error('Error verifying admin role:', error);
        setHasAdminRole(false);
      }
    };

    verifyAdminRole();
  }, [user]);

  useEffect(() => {
    if (hasAdminRole) {
      Promise.all([
        fetchPendingCount(),
        fetchPendingLandTitleCount(),
        fetchPendingPermitsCount(),
        fetchPendingMutationsCount(),
        fetchPendingExpertiseCount(),
        fetchPendingSubdivisionsCount(),
        fetchPendingPaymentsCount(),
        fetchPendingDisputesCount(),
        fetchPendingMortgagesCount(),
      ]);
    }
  }, [hasAdminRole]);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);
      
      if (error) {
        console.error('Erreur lors du chargement des contributions:', error);
        return;
      }
      
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des contributions en attente:', error);
    }
  };

  const fetchPendingLandTitleCount = async () => {
    try {
      const { count, error } = await supabase
        .from('land_title_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_review']);
      
      if (!error) {
        setPendingLandTitleCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur titres fonciers:', error);
    }
  };

  const fetchPendingPermitsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .not('permit_request_data', 'is', null)
        .eq('status', 'pending');
      
      if (!error) {
        setPendingPermitsCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur permis:', error);
    }
  };

  const fetchPendingMutationsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('mutation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error) {
        setPendingMutationsCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur mutations:', error);
    }
  };

  const fetchPendingExpertiseCount = async () => {
    try {
      const { count, error } = await supabase
        .from('real_estate_expertise_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error) {
        setPendingExpertiseCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur expertises:', error);
    }
  };

  const fetchPendingSubdivisionsCount = async () => {
    try {
      // subdivision_requests may not exist yet - gracefully handle
      const { count, error } = await (supabase as any)
        .from('subdivision_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error) {
        setPendingSubdivisionsCount(count || 0);
      } else {
        // Table may not exist, silently ignore
        setPendingSubdivisionsCount(0);
      }
    } catch (error) {
      setPendingSubdivisionsCount(0);
    }
  };

  const fetchPendingPaymentsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error) {
        setPendingPaymentsCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur paiements:', error);
    }
  };

  const fetchPendingDisputesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('cadastral_land_disputes')
        .select('*', { count: 'exact', head: true })
        .in('current_status', ['pending', 'under_investigation']);

      if (!error) {
        setPendingDisputesCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur litiges:', error);
    }
  };

  const fetchPendingMortgagesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('cadastral_mortgages')
        .select('*', { count: 'exact', head: true })
        .eq('mortgage_status', 'pending');

      if (!error) {
        setPendingMortgagesCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur compteur hypothèques:', error);
    }
  };

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
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardOverview />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'users':
        return <AdminUsers onRefresh={fetchPendingCount} />;
      case 'roles':
        return <AdminUserRolesEnhanced />;
      case 'permissions':
        return <AdminPermissions />;
      case 'fraud':
        return <AdminFraudDetection />;
      case 'ccc':
        return <AdminCCCContributions />;
      case 'validation':
        return <AdminValidation />;
      case 'ccc-codes':
        return <AdminCCCCodes />;
      case 'contribution-config':
        return <AdminContributionConfig />;
      case 'payments':
        return <AdminPayments onRefresh={fetchPendingCount} />;
      case 'payment-methods':
        return <AdminPaymentMethods />;
      case 'payment-mode':
        return <AdminPaymentMode />;
      case 'payment-monitoring':
        return <AdminPaymentMonitoring />;
      case 'payment-integration':
        return <AdminPaymentServiceIntegration />;
      case 'test-mode':
        return <AdminTestMode />;
      case 'billing-config':
        return <AdminBillingConfig />;
      case 'invoices':
        return <AdminInvoices />;
      case 'financial':
        return <AdminFinancialDashboard />;
      case 'transactions':
        return <AdminTransactions />;
      case 'commissions':
        return <AdminCommissions />;
      case 'resellers':
        return <AdminResellers />;
      case 'discount-codes':
        return <AdminDiscountCodes />;
      case 'services':
        return <AdminCadastralServices />;
      case 'catalog-config':
        return <AdminCatalogConfig />;
      case 'cadastral-map':
        return <AdminCadastralMap />;
      case 'map-providers':
        return <AdminMapProviders />;
      case 'cadastral-tooltip':
        return <AdminCadastralTooltip />;
      case 'search-config':
        return <AdminSearchBarConfig />;
      case 'results-config':
        return <AdminResultsConfig />;
      case 'zones':
        return <AdminTerritorialZones />;
      case 'permits':
        return <AdminBuildingPermits />;
      case 'land-title-requests':
        return <AdminLandTitleRequests />;
      case 'mutations':
        return <AdminMutationRequests />;
      case 'subdivision-requests':
        return <AdminSubdivisionRequests />;
      case 'expertise-requests':
        return <AdminExpertiseRequests />;
      case 'expertise-fees-config':
        return <AdminExpertiseFeesConfig />;
      case 'permit-fees-config':
        return <AdminPermitFeesConfig />;
      case 'mutation-fees-config':
        return <AdminMutationFeesConfig />;
      case 'mortgages':
        return <AdminMortgages />;
      case 'tax-history':
        return <AdminTaxHistory />;
      case 'tax-declarations':
        return <AdminTaxDeclarations />;
      case 'ownership-history':
        return <AdminOwnershipHistory />;
      case 'boundary-history':
        return <AdminBoundaryHistory />;
      case 'ccc-usage':
        return <AdminCCCUsage />;
      case 'payment-reconciliation':
        return <AdminPaymentReconciliation />;
      case 'reseller-commissions':
        return <AdminResellerCommissions />;
      case 'system-health':
        return <AdminSystemHealth />;
      case 'publications':
        return <AdminPublications onRefresh={fetchPendingCount} />;
      case 'articles':
        return <AdminArticles />;
      case 'article-themes':
        return <AdminArticleThemes />;
      case 'notifications':
        return <AdminNotifications />;
      case 'parcel-actions-config':
        return <AdminParcelActionsConfig />;
      case 'land-disputes':
        return <AdminLandDisputes />;
      case 'dispute-analytics':
        return <AdminDisputeAnalytics />;
      case 'certificates':
        return <AdminCertificates />;
      case 'analytics-charts-config':
        return <AdminAnalyticsChartsConfig />;
      case 'audit-logs':
        return <AdminAuditLogs />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
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

      {/* Mobile Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminDashboardHeader 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4">
          <div className="max-w-[360px] mx-auto md:max-w-none">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
