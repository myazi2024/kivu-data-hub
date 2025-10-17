import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, FileText, CreditCard, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import AdminPublications from '@/components/admin/AdminPublications';
import AdminPayments from '@/components/admin/AdminPayments';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import AdminStatisticsCharts from '@/components/statistics/AdminStatisticsCharts';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminResellers from '@/components/admin/AdminResellers';
import AdminTerritorialZones from '@/components/admin/AdminTerritorialZones';
import { AdminUserRoles } from '@/components/admin/AdminUserRoles';
import AdminCadastralServices from '@/components/admin/AdminCadastralServices';
import AdminCCCContributions from '@/components/admin/AdminCCCContributions';
import AdminValidation from '@/components/admin/AdminValidation';

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPublications: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch publications count
      const { count: publicationsCount } = await supabase
        .from('publications')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue from publications
      const { data: publicationPayments } = await supabase
        .from('payments')
        .select('amount_usd')
        .eq('status', 'completed');

      const publicationRevenue = publicationPayments?.reduce((sum, payment) => sum + (payment.amount_usd || 0), 0) || 0;

      // Fetch total revenue from cadastral services
      const { data: cadastralInvoices } = await supabase
        .from('cadastral_invoices')
        .select('total_amount_usd')
        .eq('status', 'paid');

      const cadastralRevenue = cadastralInvoices?.reduce((sum, invoice) => sum + (Number(invoice.total_amount_usd) || 0), 0) || 0;

      // Total revenue from both systems
      const totalRevenue = publicationRevenue + cadastralRevenue;

      // Fetch pending payments count from both systems
      const { count: pendingPublicationPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingCadastralInvoices } = await supabase
        .from('cadastral_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const totalPending = (pendingPublicationPayments || 0) + (pendingCadastralInvoices || 0);

      setStats({
        totalUsers: usersCount || 0,
        totalPublications: publicationsCount || 0,
        totalRevenue,
        pendingPayments: totalPending
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Administration BIC</h1>
          <p className="text-muted-foreground">Gestion des publications, utilisateurs et paiements</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Publications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPublications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paiements en Attente</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pendingPayments}
                {stats.pendingPayments > 0 && (
                  <Badge variant="destructive" className="ml-2">Nouveau</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
          <Tabs defaultValue="publications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-10">
              <TabsTrigger value="publications">Publications</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="roles">Rôles</TabsTrigger>
              <TabsTrigger value="resellers">Revendeurs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="territorial">Zones</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="contributions">CCC</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>

          <TabsContent value="publications">
            <AdminPublications onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPayments onRefresh={fetchStats} />
          </TabsContent>

            <TabsContent value="users">
              <AdminUsers onRefresh={fetchStats} />
            </TabsContent>

            <TabsContent value="roles">
              <AdminUserRoles />
            </TabsContent>

            <TabsContent value="resellers">
            <AdminResellers onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminStatisticsCharts onExport={() => console.log('Export statistiques')} />
          </TabsContent>

          <TabsContent value="territorial">
            <AdminTerritorialZones />
          </TabsContent>

          <TabsContent value="services">
            <AdminCadastralServices onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="contributions">
            <AdminCCCContributions />
          </TabsContent>

          <TabsContent value="validation">
            <AdminValidation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;