import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { Users, DollarSign, FileCheck, AlertTriangle, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PeriodFilter } from './dashboard/PeriodFilter';
import { AdvancedMetrics } from './dashboard/AdvancedMetrics';
import { RecentActivity } from './dashboard/RecentActivity';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { TopPerformers } from './dashboard/TopPerformers';
import { AdditionalCharts } from './dashboard/AdditionalCharts';

import { ComparativeAnalysis } from './dashboard/ComparativeAnalysis';
import { BusinessMetrics } from './dashboard/BusinessMetrics';
import { GeographicalAnalysis } from './dashboard/GeographicalAnalysis';
import { ContributionPerformance } from './dashboard/ContributionPerformance';

import { ResellerAnalysis } from './dashboard/ResellerAnalysis';
import { CohortAnalysis } from './dashboard/CohortAnalysis';
import { AutomatedReports } from './dashboard/AutomatedReports';
import { useEnhancedAnalytics } from '@/hooks/useEnhancedAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV, exportToJSON } from '@/utils/exportDashboardData';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const {
    periodType,
    setPeriodType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    periodRange,
  } = usePeriodFilter();

  const { loading, statistics } = useAdminStatistics(
    periodRange.startDate,
    periodRange.endDate,
    'overview'
  );

  const { loading: prevLoading, statistics: prevStatistics } = useAdminStatistics(
    periodRange.previousStartDate,
    periodRange.previousEndDate,
    'overview'
  );

  const { statistics: revenueData, loading: revenueLoading } = useAdminStatistics(
    periodRange.startDate,
    periodRange.endDate,
    'revenue_by_day'
  );

  const { statistics: paymentMethodsData, loading: pmLoading } = useAdminStatistics(
    periodRange.startDate,
    periodRange.endDate,
    'payment_methods'
  );

  const { statistics: servicesData, loading: servicesLoading } = useAdminStatistics(
    periodRange.startDate,
    periodRange.endDate,
    'services_usage'
  );

  const { statistics: userGrowthData, loading: ugLoading } = useAdminStatistics(
    periodRange.startDate,
    periodRange.endDate,
    'user_growth'
  );

  const { loading: dashboardLoading, data: dashboardData } = useDashboardData(
    periodRange.startDate,
    periodRange.endDate
  );

  const { data: enhancedData, loading: enhancedLoading } = useEnhancedAnalytics(
    periodRange.startDate,
    periodRange.endDate
  );

  const calculateChange = (current: number, previous: number): string => {
    if (previous === 0 && current === 0) return '0%';
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const isPositiveChange = (current: number, previous: number): boolean => {
    return current >= previous;
  };

  const handleExportCSV = () => {
    exportToCSV({
      statistics,
      periodRange: {
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
      },
    });
    toast.success('Export CSV réussi');
  };

  const handleExportJSON = () => {
    exportToJSON({
      statistics,
      periodRange: {
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
      },
    });
    toast.success('Export JSON réussi');
  };

  const handleAlertAction = (alertType: string) => {
    const routes: Record<string, string> = {
      overdue: '/admin?tab=validation',
      failed: '/admin?tab=payments',
      blocked: '/admin?tab=users',
      expired: '/admin?tab=ccc-codes',
      inactive: '/admin?tab=resellers',
      disputes: '/admin?tab=land-disputes',
      mortgages: '/admin?tab=mortgages',
    };
    navigate(routes[alertType] || '/admin');
  };

  const handleViewActivity = (id: string, type: string) => {
    const routes: Record<string, string> = {
      contribution: `/admin?tab=ccc`,
      payment: `/admin?tab=payments`,
      registration: `/admin?tab=users`,
    };
    navigate(routes[type] || '/admin');
  };

  if (loading && prevLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Utilisateurs',
      value: statistics.total_users || 0,
      icon: Users,
      change: calculateChange(statistics.total_users || 0, prevStatistics.total_users || 0),
      positive: isPositiveChange(statistics.total_users || 0, prevStatistics.total_users || 0),
      description: 'vs période précédente',
    },
    {
      title: 'Revenus Totaux',
      value: `$${(statistics.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      change: calculateChange(statistics.total_revenue || 0, prevStatistics.total_revenue || 0),
      positive: isPositiveChange(statistics.total_revenue || 0, prevStatistics.total_revenue || 0),
      description: 'vs période précédente',
    },
    {
      title: 'Contributions Approuvées',
      value: statistics.approved_contributions || 0,
      icon: FileCheck,
      change: calculateChange(statistics.approved_contributions || 0, prevStatistics.approved_contributions || 0),
      positive: isPositiveChange(statistics.approved_contributions || 0, prevStatistics.approved_contributions || 0),
      description: `/${statistics.total_contributions || 0} total`,
    },
    {
      title: 'Paiements en attente',
      value: statistics.pending_payments || 0,
      icon: AlertTriangle,
      change: calculateChange(statistics.pending_payments || 0, prevStatistics.pending_payments || 0),
      positive: !isPositiveChange(statistics.pending_payments || 0, prevStatistics.pending_payments || 0),
      description: 'à traiter',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <PeriodFilter
        periodType={periodType}
        onPeriodChange={setPeriodType}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
      />

      {/* Main Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate pr-1">
                  {stat.title}
                </CardTitle>
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold truncate">{stat.value}</div>
                <div className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs text-muted-foreground mt-1">
                  {stat.positive ? (
                    <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3 text-success shrink-0" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3 text-destructive shrink-0" />
                  )}
                  <span className={stat.positive ? 'text-success' : 'text-destructive'}>
                    {stat.change}
                  </span>
                  <span className="truncate">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Advanced Metrics */}
      <AdvancedMetrics
        loading={dashboardLoading}
        metrics={{
          conversionRate: dashboardData.conversionRate,
          avgProcessingTime: dashboardData.avgProcessingTime,
          avgTransactionValue: dashboardData.avgTransactionValue,
          cccUsageRate: dashboardData.cccUsageRate,
          revenuePerReseller: dashboardData.revenuePerReseller,
          activeResellers: dashboardData.activeResellers,
        }}
      />

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Évolution des revenus</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {revenueLoading ? (
            <Skeleton className="h-48 md:h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200} className="md:!h-[250px]">
              <LineChart data={revenueData.revenue_by_day || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenus']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Alerts and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <AlertsPanel
          loading={dashboardLoading}
          alerts={{
            overdueContributions: dashboardData.overdueContributions,
            failedPayments: dashboardData.failedPayments,
            blockedUsers: dashboardData.blockedUsers,
            expiredCodes: dashboardData.expiredCodes,
            inactiveResellers: dashboardData.inactiveResellers,
            pendingDisputes: dashboardData.pendingDisputes,
            pendingMortgages: dashboardData.pendingMortgages,
          }}
          onAlertAction={handleAlertAction}
        />
        <RecentActivity
          loading={dashboardLoading}
          activities={dashboardData.recentActivities}
          onViewDetails={handleViewActivity}
        />
      </div>

      {/* Enhanced Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Vue d'ensemble</TabsTrigger>
          
          <TabsTrigger value="business" className="text-xs md:text-sm">Métriques Business</TabsTrigger>
          <TabsTrigger value="comparative" className="text-xs md:text-sm">Comparatif</TabsTrigger>
          <TabsTrigger value="cohort" className="text-xs md:text-sm">Cohortes</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs md:text-sm">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AdditionalCharts
            loading={pmLoading || servicesLoading || ugLoading}
            paymentMethodsData={paymentMethodsData?.payment_methods || []}
            servicesData={servicesData?.services_usage || []}
            userGrowthData={userGrowthData?.user_growth || []}
            contributionApprovalData={[]}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <GeographicalAnalysis loading={enhancedLoading} zonesData={enhancedData?.zonesData ?? []} />
            <ResellerAnalysis loading={enhancedLoading} resellers={enhancedData?.resellersAnalysis ?? []} />
          </div>
        </TabsContent>


        <TabsContent value="business">
          <BusinessMetrics loading={enhancedLoading} metrics={enhancedData?.businessMetrics} />
          <div className="mt-4">
            <ContributionPerformance loading={enhancedLoading} data={enhancedData?.contributionPerf} />
          </div>
        </TabsContent>

        <TabsContent value="comparative">
          <ComparativeAnalysis
            loading={enhancedLoading || loading || prevLoading}
            currentPeriodData={{
              revenue: statistics.total_revenue || 0,
              transactions: statistics.total_invoices || 0,
              avgTransaction: (statistics.total_revenue || 0) / Math.max(statistics.total_invoices || 1, 1),
              newUsers: statistics.total_users || 0,
            }}
            previousPeriodData={{
              revenue: prevStatistics.total_revenue || 0,
              transactions: prevStatistics.total_invoices || 0,
              avgTransaction: (prevStatistics.total_revenue || 0) / Math.max(prevStatistics.total_invoices || 1, 1),
              newUsers: prevStatistics.total_users || 0,
            }}
          />
        </TabsContent>

        <TabsContent value="cohort">
          <CohortAnalysis loading={enhancedLoading} cohorts={enhancedData?.cohortData} />
        </TabsContent>

        <TabsContent value="reports">
          <AutomatedReports />
        </TabsContent>
      </Tabs>

      {/* Top Performers and Quick Stats */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopPerformers
          loading={dashboardLoading}
          topResellers={dashboardData.topResellers}
          topUsers={dashboardData.topUsers}
          topZones={dashboardData.topZones}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-sm md:text-base">Contributions à valider</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span className="font-medium">
                    {statistics.approved_contributions || 0} / {statistics.total_contributions || 0}
                  </span>
                </div>
                <Progress
                  value={
                    statistics.total_contributions
                      ? ((statistics.approved_contributions || 0) / statistics.total_contributions) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-sm md:text-base">Codes CCC générés</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-3xl font-bold">{statistics.total_ccc_codes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Taux d'utilisation: {dashboardData.cccUsageRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-sm md:text-base">Revendeurs actifs</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-3xl font-bold">{statistics.total_resellers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Revenu moyen: ${dashboardData.revenuePerReseller.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
