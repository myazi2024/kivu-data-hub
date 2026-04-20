import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { PaymentAnalytics } from './PaymentAnalytics';
import { CadastralAnalytics } from './CadastralAnalytics';
import { BusinessKPIs } from './BusinessKPIs';
import { TerritorialPerformance } from './TerritorialPerformance';
import { ComparativeAnalytics } from './ComparativeAnalytics';
import { CohortAnalysis } from './CohortAnalysis';
import { ConversionFunnel } from './ConversionFunnel';
import { PredictiveAnalytics } from './PredictiveAnalytics';

/**
 * AnalyticsDashboard — onglets spécialisés uniquement.
 * L'onglet « Vue d'ensemble » a été retiré (doublonnait AdminDashboardOverview)
 * pour garantir une source unique de vérité (RPC get_admin_dashboard_full).
 */
const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30');

  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));
    return { startDate, endDate };
  }, [timeRange]);

  const advancedAnalytics = useAdvancedAnalytics(dateRange.startDate, dateRange.endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Analytics avancés</h2>
          <p className="text-sm text-muted-foreground">
            Pour la vue d'ensemble synthétique, consultez l'onglet « Dashboard ».
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">3 derniers mois</SelectItem>
            <SelectItem value="365">Dernière année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Les KPIs globaux (revenus, utilisateurs, alertes) sont centralisés dans le{' '}
            <strong className="text-foreground">Dashboard admin</strong>. Cet espace est dédié
            aux analyses spécialisées par domaine.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="payments" className="text-xs">Paiements</TabsTrigger>
          <TabsTrigger value="cadastral" className="text-xs">Cadastral</TabsTrigger>
          <TabsTrigger value="business" className="text-xs">KPIs Business</TabsTrigger>
          <TabsTrigger value="territorial" className="text-xs">Territorial</TabsTrigger>
          <TabsTrigger value="comparative" className="text-xs">Comparatif</TabsTrigger>
          <TabsTrigger value="cohorts" className="text-xs">Cohortes</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs">Funnel</TabsTrigger>
          <TabsTrigger value="predictive" className="text-xs">Prédictif</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <PaymentAnalytics data={advancedAnalytics.paymentAnalytics} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="cadastral" className="mt-6">
          <CadastralAnalytics data={advancedAnalytics.cadastralAnalytics} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <BusinessKPIs data={advancedAnalytics.businessKPIs} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="territorial" className="mt-6">
          <TerritorialPerformance data={advancedAnalytics.territorialPerformance} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="comparative" className="mt-6">
          <ComparativeAnalytics data={advancedAnalytics.comparativeData} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="cohorts" className="mt-6">
          <CohortAnalysis data={advancedAnalytics.cohortData} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          <ConversionFunnel data={advancedAnalytics.funnelData} loading={advancedAnalytics.loading} />
        </TabsContent>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalytics data={advancedAnalytics.predictiveData} loading={advancedAnalytics.loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
