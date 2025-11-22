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
import AdminUsers from '@/components/admin/AdminUsers';
import AdminResellers from '@/components/admin/AdminResellers';
import AdminTerritorialZones from '@/components/admin/AdminTerritorialZones';
import { AdminUserRoles } from '@/components/admin/AdminUserRoles';
import AdminCadastralServices from '@/components/admin/AdminCadastralServices';
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
import AdminFraudDetection from '@/components/admin/AdminFraudDetection';
import AdminInvoices from '@/components/admin/AdminInvoices';
import AdminFinancialDashboard from '@/components/admin/AdminFinancialDashboard';
import AdminTransactions from '@/components/admin/AdminTransactions';
import AdminCommissions from '@/components/admin/AdminCommissions';
import AdminDiscountCodes from '@/components/admin/AdminDiscountCodes';
import AdminBuildingPermits from '@/components/admin/AdminBuildingPermits';

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
        return <AdminUserRoles />;
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
      case 'publications':
        return <AdminPublications onRefresh={fetchPendingCount} />;
      case 'articles':
        return <AdminArticles />;
      case 'notifications':
        return <AdminNotifications />;
      case 'audit-logs':
        return <AdminAuditLogs />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 lg:w-64 flex-col border-r bg-card">
        <div className="p-4 lg:p-6 border-b">
          <h2 className="text-base lg:text-lg font-semibold">Admin Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-1">Gestion complète</p>
        </div>
        <AdminSidebar pendingCount={pendingCount} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold">Admin Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gestion complète</p>
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
        
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
