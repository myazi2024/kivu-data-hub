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
import AdminParcelTooltipConfig from '@/components/admin/AdminParcelTooltipConfig';
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

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchPendingCount();
    }
  }, [profile]);

  const fetchPendingCount = async () => {
    try {
      const { count } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);
      
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des contributions en attente:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
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
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Gestion Factures - Coming soon</p>
          </div>
        );
      case 'resellers':
        return <AdminResellers />;
      case 'services':
        return <AdminCadastralServices />;
      case 'cadastral-map':
        return <AdminCadastralMap />;
      case 'parcel-tooltip-config':
        return <AdminParcelTooltipConfig />;
      case 'search-config':
        return <AdminSearchConfig />;
      case 'results-config':
        return <AdminResultsConfig />;
      case 'zones':
        return <AdminTerritorialZones />;
      case 'permits':
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Permis de Construire - Coming soon</p>
          </div>
        );
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
          notificationCount={pendingCount}
        />
        
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
