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
import AdminSearchConfig from '@/components/admin/AdminSearchConfig';
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
import AdminBoundaryConflicts from '@/components/admin/AdminBoundaryConflicts';
import AdminMortgages from '@/components/admin/AdminMortgages';
import AdminTaxHistory from '@/components/admin/AdminTaxHistory';
import AdminOwnershipHistory from '@/components/admin/AdminOwnershipHistory';
import AdminBoundaryHistory from '@/components/admin/AdminBoundaryHistory';
import AdminCCCUsage from '@/components/admin/AdminCCCUsage';
import AdminPaymentReconciliation from '@/components/admin/AdminPaymentReconciliation';
import AdminResellerCommissions from '@/components/admin/AdminResellerCommissions';
import AdminSystemHealth from '@/components/admin/AdminSystemHealth';
import AdminLandTitleRequests from '@/components/admin/AdminLandTitleRequests';
const Admin = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
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
      fetchPendingCount();
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
        toast.error('Erreur lors du chargement des contributions en attente');
        return;
      }
      
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des contributions en attente:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  };

  if (loading || hasAdminRole === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAdminRole) {
    toast.error('Accès refusé. Vous devez avoir un rôle administrateur.');
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
      case 'cadastral-tooltip':
        return <AdminCadastralTooltip />;
      case 'search-config':
        return <AdminSearchConfig />;
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
      case 'expertise-requests':
        return <AdminExpertiseRequests />;
      case 'expertise-fees-config':
        return <AdminExpertiseFeesConfig />;
      case 'permit-fees-config':
        return <AdminPermitFeesConfig />;
      case 'mutation-fees-config':
        return <AdminMutationFeesConfig />;
      case 'boundary-conflicts':
        return <AdminBoundaryConflicts />;
      case 'mortgages':
        return <AdminMortgages />;
      case 'tax-history':
        return <AdminTaxHistory />;
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
      case 'audit-logs':
        return <AdminAuditLogs />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-52 lg:w-60 flex-col border-r bg-card/50 backdrop-blur-sm">
        <div className="p-3 lg:p-4 border-b bg-background/80">
          <h2 className="text-sm lg:text-base font-bold">Admin</h2>
          <p className="text-[10px] text-muted-foreground">Gestion complète</p>
        </div>
        <AdminSidebar pendingCount={pendingCount} />
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
