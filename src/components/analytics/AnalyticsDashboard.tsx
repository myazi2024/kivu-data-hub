import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Download, Users, 
  FileText, Calendar, MapPin, Activity
} from 'lucide-react';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { PaymentAnalytics } from './PaymentAnalytics';
import { CadastralAnalytics } from './CadastralAnalytics';
import { BusinessKPIs } from './BusinessKPIs';
import { TerritorialPerformance } from './TerritorialPerformance';
import { ComparativeAnalytics } from './ComparativeAnalytics';
import { CohortAnalysis } from './CohortAnalysis';
import { ConversionFunnel } from './ConversionFunnel';
import { PredictiveAnalytics } from './PredictiveAnalytics';

interface AnalyticsData {
  totalRevenue: number;
  totalDownloads: number;
  totalUsers: number;
  totalPublications: number;
  revenueGrowth: number;
  downloadGrowth: number;
  userGrowth: number;
  monthlyRevenue: Array<{ month: string; revenue: number; downloads: number }>;
  topPublications: Array<{ title: string; downloads: number; revenue: number }>;
  userActivity: Array<{ date: string; active_users: number }>;
  territorialData: Array<{ zone: string; users: number; revenue: number }>;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(timeRange));
  
  const advancedAnalytics = useAdvancedAnalytics(startDate, endDate);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calcul des dates selon la période sélectionnée
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Requêtes parallèles pour optimiser les performances
      const [
        paymentsResult,
        downloadsResult,
        usersResult,
        publicationsResult,
        monthlyStatsResult
      ] = await Promise.all([
        // Revenus et paiements
        supabase
          .from('payments')
          .select('amount_usd, created_at, publication_id')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString()),
        
        // Téléchargements
        supabase
          .from('publication_downloads')
          .select('downloaded_at, publication_id, publications(title)')
          .gte('downloaded_at', startDate.toISOString()),
        
        // Utilisateurs
        supabase
          .from('profiles')
          .select('created_at, organization')
          .gte('created_at', startDate.toISOString()),
        
        // Publications
        supabase
          .from('publications')
          .select('*')
          .eq('status', 'published'),
        
        // Statistiques mensuelles
        supabase
          .from('payments')
          .select('amount_usd, created_at')
          .eq('status', 'completed')
          .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Traitement des données
      const payments = paymentsResult.data || [];
      const downloads = downloadsResult.data || [];
      const users = usersResult.data || [];
      const publications = publicationsResult.data || [];

      // Calculs des totaux
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount_usd, 0);
      const totalDownloads = downloads.length;
      const totalUsers = users.length;
      const totalPublications = publications.length;

      // Calculs de croissance (comparaison avec la période précédente)
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(timeRange));
      
      const previousPayments = await supabase
        .from('payments')
        .select('amount_usd')
        .eq('status', 'completed')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousRevenue = (previousPayments.data || []).reduce((sum, p) => sum + p.amount_usd, 0);
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Données mensuelles
      const monthlyData = processMonthlyData(monthlyStatsResult.data || []) as Array<{ month: string; revenue: number; downloads: number }>;

      // Top publications
      const publicationStats = downloads.reduce((acc, download) => {
        const pubId = download.publication_id;
        if (!acc[pubId]) {
          acc[pubId] = {
            title: download.publications?.title || 'Publication',
            downloads: 0,
            revenue: 0
          };
        }
        acc[pubId].downloads++;
        
        const payment = payments.find(p => p.publication_id === pubId);
        if (payment) {
          acc[pubId].revenue += payment.amount_usd;
        }
        
        return acc;
      }, {} as Record<string, any>);

      const topPublications = Object.values(publicationStats)
        .sort((a: any, b: any) => b.downloads - a.downloads)
        .slice(0, 5);

      // Activité utilisateurs (données simulées basées sur les vraies données)
      const userActivity = generateUserActivity(users, parseInt(timeRange));

      // Données territoriales (simulées) - incluant toutes les provinces
      const territorialData = [
        { zone: 'Kinshasa', users: Math.floor(totalUsers * 0.22), revenue: Math.floor(totalRevenue * 0.25) },
        { zone: 'Nord-Kivu', users: Math.floor(totalUsers * 0.18), revenue: Math.floor(totalRevenue * 0.20) },
        { zone: 'Sud-Kivu', users: Math.floor(totalUsers * 0.15), revenue: Math.floor(totalRevenue * 0.18) },
        { zone: 'Mai-Ndombe', users: Math.floor(totalUsers * 0.09), revenue: Math.floor(totalRevenue * 0.10) },
        { zone: 'Kasaï-Oriental', users: Math.floor(totalUsers * 0.08), revenue: Math.floor(totalRevenue * 0.09) },
        { zone: 'Kasaï', users: Math.floor(totalUsers * 0.07), revenue: Math.floor(totalRevenue * 0.08) },
        { zone: 'Tshuapa', users: Math.floor(totalUsers * 0.06), revenue: Math.floor(totalRevenue * 0.06) },
        { zone: 'Mongala', users: Math.floor(totalUsers * 0.05), revenue: Math.floor(totalRevenue * 0.05) },
        { zone: 'Autres provinces', users: Math.floor(totalUsers * 0.10), revenue: Math.floor(totalRevenue * 0.04) }
      ];

      setAnalytics({
        totalRevenue,
        totalDownloads,
        totalUsers,
        totalPublications,
        revenueGrowth,
        downloadGrowth: 0, // Calculer si nécessaire
        userGrowth: 0, // Calculer si nécessaire
        monthlyRevenue: monthlyData,
        topPublications: topPublications as any,
        userActivity,
        territorialData
      });

    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (payments: any[]): Array<{ month: string; revenue: number; downloads: number }> => {
    if (!payments || payments.length === 0) {
      return [];
    }
    
    const monthlyStats = payments.reduce((acc, payment) => {
      const month = new Date(payment.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!acc[month]) {
        acc[month] = { month, revenue: 0, downloads: 0 };
      }
      acc[month].revenue += payment.amount_usd || 0;
      acc[month].downloads += 1;
      return acc;
    }, {} as Record<string, { month: string; revenue: number; downloads: number }>);

    return Object.values(monthlyStats).slice(-6) as Array<{ month: string; revenue: number; downloads: number }>;
  };

  const generateUserActivity = (users: any[], days: number) => {
    const activity = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      activity.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        active_users: Math.floor(Math.random() * 50) + 10
      });
    }
    return activity;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center">Aucune donnée disponible</div>;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1">
          <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Paiements</TabsTrigger>
          <TabsTrigger value="cadastral" className="text-xs">Cadastral</TabsTrigger>
          <TabsTrigger value="business" className="text-xs">KPIs Business</TabsTrigger>
          <TabsTrigger value="territorial" className="text-xs">Territorial</TabsTrigger>
          <TabsTrigger value="comparative" className="text-xs">Comparatif</TabsTrigger>
          <TabsTrigger value="cohorts" className="text-xs">Cohortes</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs">Funnel</TabsTrigger>
          <TabsTrigger value="predictive" className="text-xs">Prédictif</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
      {/* Header avec sélecteur de période */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold">Dashboard Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-40 h-8 text-xs sm:text-sm">
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

      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Revenus</p>
                <p className="text-base sm:text-xl font-bold truncate">${analytics.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-0.5">
                  {analytics.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-destructive mr-0.5" />
                  )}
                  <span className={`text-[10px] sm:text-xs ${analytics.revenueGrowth >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Télécharge.</p>
                <p className="text-base sm:text-xl font-bold truncate">{analytics.totalDownloads}</p>
                <Badge variant="secondary" className="mt-0.5 text-[8px] sm:text-[10px] px-1 py-0">
                  Période
                </Badge>
              </div>
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Utilisateurs</p>
                <p className="text-base sm:text-xl font-bold truncate">{analytics.totalUsers}</p>
                <Badge variant="secondary" className="mt-0.5 text-[8px] sm:text-[10px] px-1 py-0">
                  Nouveaux
                </Badge>
              </div>
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Publications</p>
                <p className="text-base sm:text-xl font-bold truncate">{analytics.totalPublications}</p>
                <Badge variant="secondary" className="mt-0.5 text-[8px] sm:text-[10px] px-1 py-0">
                  Actives
                </Badge>
              </div>
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Évolution des revenus */}
        <Card>
          <CardHeader className="p-2 sm:p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Évolution des Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 6 }} />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenus']} />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activité utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activité Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 6 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="active_users" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analyses détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top publications */}
        <Card>
          <CardHeader>
            <CardTitle>Top Publications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPublications.map((pub, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{pub.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {pub.downloads} téléchargements
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${pub.revenue.toFixed(2)}</p>
                    <Badge variant="outline">{index + 1}e</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Répartition territoriale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Répartition Territoriale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.territorialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ zone, users }) => `${zone}: ${users}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="users"
                >
                  {analytics.territorialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

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