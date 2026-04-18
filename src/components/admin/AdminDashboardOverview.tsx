import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { useDashboardUrlState } from '@/hooks/useDashboardUrlState';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { Progress } from '@/components/ui/progress';
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
import { DashboardHeader } from './dashboard/DashboardHeader';
import { KPICards } from './dashboard/KPICards';
import { RevenueChartEnhanced } from './dashboard/RevenueChartEnhanced';
import { useEnhancedAnalytics } from '@/hooks/useEnhancedAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV, exportToJSON } from '@/utils/exportDashboardData';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const [innerTab, setInnerTab] = useState('overview');
  const { excludeTest, toggleExcludeTest, thresholds } = useDashboardSettings();

  const {
    periodType, setPeriodType,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    periodRange,
  } = usePeriodFilter();

  useDashboardUrlState(periodType, setPeriodType, innerTab, setInnerTab);

  // Unified KPIs (single source of truth)
  const { data: dashFull, isLoading: kpisLoading, refetch: refetchKpis, isFetching } = useDashboardKPIs(
    periodRange.startDate, periodRange.endDate,
    periodRange.previousStartDate, periodRange.previousEndDate,
    excludeTest
  );

  // Period stats (revenue chart, payment methods, services, growth)
  const { statistics: revenueData, loading: revenueLoading } = useAdminStatistics(
    periodRange.startDate, periodRange.endDate, 'revenue_by_day', excludeTest
  );
  const { statistics: prevRevenueData } = useAdminStatistics(
    periodRange.previousStartDate, periodRange.previousEndDate, 'revenue_by_day', excludeTest
  );
  const { statistics: paymentMethodsData, loading: pmLoading } = useAdminStatistics(
    periodRange.startDate, periodRange.endDate, 'payment_methods', excludeTest
  );
  const { statistics: servicesData, loading: servicesLoading } = useAdminStatistics(
    periodRange.startDate, periodRange.endDate, 'services_usage', excludeTest
  );
  const { statistics: userGrowthData, loading: ugLoading } = useAdminStatistics(
    periodRange.startDate, periodRange.endDate, 'user_growth', excludeTest
  );

  const { loading: dashboardLoading, data: dashboardData, refetch: refetchDash } = useDashboardData(
    periodRange.startDate, periodRange.endDate, excludeTest
  );

  const { data: enhancedData, loading: enhancedLoading, refetch: refetchEnhanced } = useEnhancedAnalytics(
    periodRange.startDate, periodRange.endDate, excludeTest
  );

  const handleRefresh = () => {
    refetchKpis();
    refetchDash();
    refetchEnhanced();
    toast.success('Données actualisées');
  };

  const handleExportCSV = () => {
    exportToCSV({
      statistics: dashFull?.kpis as any,
      periodRange: { startDate: periodRange.startDate, endDate: periodRange.endDate },
    });
    toast.success('Export CSV réussi');
  };

  const handleExportJSON = () => {
    exportToJSON({
      statistics: dashFull as any,
      periodRange: { startDate: periodRange.startDate, endDate: periodRange.endDate },
    });
    toast.success('Export JSON réussi');
  };

  const handleAlertAction = (alertType: string) => {
    const routes: Record<string, string> = {
      overdue: '/admin?tab=validation', failed: '/admin?tab=payments',
      blocked: '/admin?tab=users', expired: '/admin?tab=ccc-codes',
      inactive: '/admin?tab=resellers', disputes: '/admin?tab=land-disputes',
      mortgages: '/admin?tab=mortgages',
    };
    navigate(routes[alertType] || '/admin');
  };

  const handleViewActivity = (id: string, type: string) => {
    const routes: Record<string, string> = {
      contribution: `/admin?tab=ccc`, payment: `/admin?tab=payments`, registration: `/admin?tab=users`,
    };
    navigate(routes[type] || '/admin');
  };

  const kpis = dashFull?.kpis;
  const alerts = dashFull?.alerts;

  // Top performers from RPC (PII-safe) with fallback to dashboardData
  const topUsers = (dashFull?.top_users || []).map((u, i) => ({
    id: u.user_id || String(i), name: u.name_masked || 'Anonyme',
    value: Number(u.value || 0), rank: i + 1,
  }));
  const topResellers = (dashFull?.top_resellers || []).map((r, i) => ({
    id: r.id || String(i), name: r.name || 'N/A',
    value: Number(r.value || 0), rank: i + 1,
  }));
  const topZones = (dashFull?.top_zones || []).map((z, i) => ({
    id: z.name || String(i), name: z.name || 'N/A',
    value: Number(z.value || 0), subtitle: `${z.value} contributions`, rank: i + 1,
  }));

  return (
    <div className="space-y-4">
      <DashboardHeader
        excludeTest={excludeTest}
        onToggleExcludeTest={toggleExcludeTest}
        onRefresh={handleRefresh}
        refreshing={isFetching}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
      />

      <PeriodFilter
        periodType={periodType}
        onPeriodChange={setPeriodType}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
      />

      <KPICards kpis={kpis} loading={kpisLoading} />

      <AdvancedMetrics
        loading={dashboardLoading}
        metrics={{
          conversionRate: dashboardData.conversionRate,
          avgProcessingTime: dashboardData.avgProcessingTime,
          avgTransactionValue: dashboardData.avgTransactionValue,
          cccUsageRate: kpis && (kpis.active_ccc_codes + kpis.used_ccc_codes) > 0
            ? (kpis.used_ccc_codes / (kpis.active_ccc_codes + kpis.used_ccc_codes)) * 100
            : 0,
          revenuePerReseller: dashboardData.revenuePerReseller,
          activeResellers: dashboardData.activeResellers,
        }}
      />

      <RevenueChartEnhanced
        loading={revenueLoading}
        current={(revenueData.revenue_by_day || []) as any[]}
        previous={(prevRevenueData.revenue_by_day || []) as any[]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AlertsPanel
          loading={kpisLoading}
          alerts={{
            overdueContributions: alerts?.overdue_contributions,
            failedPayments: alerts?.failed_payments,
            blockedUsers: alerts?.blocked_users,
            expiredCodes: alerts?.expired_codes,
            inactiveResellers: alerts?.inactive_resellers,
            pendingDisputes: alerts?.pending_disputes,
            pendingMortgages: alerts?.pending_mortgages,
          }}
          thresholds={alerts?.thresholds || { overdue_days: thresholds.overdue_days, inactive_days: thresholds.inactive_days }}
          onAlertAction={handleAlertAction}
        />
        <RecentActivity
          loading={dashboardLoading}
          activities={dashboardData.recentActivities}
          onViewDetails={handleViewActivity}
        />
      </div>

      <Tabs value={innerTab} onValueChange={setInnerTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Croissance & zones</TabsTrigger>
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
            loading={kpisLoading}
            currentPeriodData={{
              revenue: kpis?.total_revenue || 0,
              transactions: kpis?.total_invoices || 0,
              avgTransaction: (kpis?.total_revenue || 0) / Math.max(kpis?.paid_invoices || 1, 1),
              newUsers: kpis?.new_users_period || 0,
            }}
            previousPeriodData={{
              revenue: kpis?.total_revenue_prev || 0,
              transactions: kpis?.total_invoices_prev || 0,
              avgTransaction: (kpis?.total_revenue_prev || 0) / Math.max(kpis?.total_invoices_prev || 1, 1),
              newUsers: kpis?.new_users_prev || 0,
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

      <div className="grid gap-4 lg:grid-cols-2">
        <TopPerformers
          loading={kpisLoading}
          topResellers={topResellers.length ? topResellers : dashboardData.topResellers}
          topUsers={topUsers.length ? topUsers : dashboardData.topUsers}
          topZones={topZones.length ? topZones : dashboardData.topZones}
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
                    {kpis?.approved_contributions || 0} / {kpis?.total_contributions || 0}
                  </span>
                </div>
                <Progress
                  value={
                    kpis?.total_contributions
                      ? ((kpis.approved_contributions || 0) / kpis.total_contributions) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-sm md:text-base">Codes CCC</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-3xl font-bold">{kpis?.active_ccc_codes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Actifs · {kpis?.used_ccc_codes || 0} utilisés · {kpis?.expired_ccc_codes || 0} expirés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-sm md:text-base">Revendeurs actifs</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-3xl font-bold">{dashboardData.activeResellers}</div>
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
