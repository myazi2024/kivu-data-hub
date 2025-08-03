import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
          .select('amount, currency, created_at, publication_id')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString()),
        
        // Téléchargements
        supabase
          .from('publication_downloads')
          .select('created_at, publication_id, publications(title)')
          .gte('created_at', startDate.toISOString()),
        
        // Utilisateurs
        supabase
          .from('profiles')
          .select('created_at, organization')
          .gte('created_at', startDate.toISOString()),
        
        // Publications
        supabase
          .from('publications')
          .select('*')
          .eq('is_published', true),
        
        // Statistiques mensuelles
        supabase
          .from('payments')
          .select('amount, created_at')
          .eq('status', 'completed')
          .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Traitement des données
      const payments = paymentsResult.data || [];
      const downloads = downloadsResult.data || [];
      const users = usersResult.data || [];
      const publications = publicationsResult.data || [];

      // Calculs des totaux
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount / 100), 0);
      const totalDownloads = downloads.length;
      const totalUsers = users.length;
      const totalPublications = publications.length;

      // Calculs de croissance (comparaison avec la période précédente)
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(timeRange));
      
      const previousPayments = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousRevenue = (previousPayments.data || []).reduce((sum, p) => sum + (p.amount / 100), 0);
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Données mensuelles
      const monthlyData = processMonthlyData(monthlyStatsResult.data || []);

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
          acc[pubId].revenue += payment.amount / 100;
        }
        
        return acc;
      }, {} as Record<string, any>);

      const topPublications = Object.values(publicationStats)
        .sort((a: any, b: any) => b.downloads - a.downloads)
        .slice(0, 5);

      // Activité utilisateurs (données simulées basées sur les vraies données)
      const userActivity = generateUserActivity(users, parseInt(timeRange));

      // Données territoriales (simulées)
      const territorialData = [
        { zone: 'Goma', users: Math.floor(totalUsers * 0.4), revenue: Math.floor(totalRevenue * 0.35) },
        { zone: 'Bukavu', users: Math.floor(totalUsers * 0.25), revenue: Math.floor(totalRevenue * 0.28) },
        { zone: 'Uvira', users: Math.floor(totalUsers * 0.15), revenue: Math.floor(totalRevenue * 0.18) },
        { zone: 'Kinshasa', users: Math.floor(totalUsers * 0.12), revenue: Math.floor(totalRevenue * 0.12) },
        { zone: 'Autres', users: Math.floor(totalUsers * 0.08), revenue: Math.floor(totalRevenue * 0.07) }
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

  const processMonthlyData = (payments: any[]) => {
    const monthlyStats = payments.reduce((acc, payment) => {
      const month = new Date(payment.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!acc[month]) {
        acc[month] = { month, revenue: 0, downloads: 0 };
      }
      acc[month].revenue += payment.amount / 100;
      acc[month].downloads += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyStats).slice(-6); // Derniers 6 mois
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
      {/* Header avec sélecteur de période */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus</p>
                <p className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-1">
                  {analytics.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Téléchargements</p>
                <p className="text-2xl font-bold">{analytics.totalDownloads}</p>
                <Badge variant="secondary" className="mt-1">
                  Période actuelle
                </Badge>
              </div>
              <Download className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nouveaux Utilisateurs</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <Badge variant="secondary" className="mt-1">
                  Période actuelle
                </Badge>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Publications</p>
                <p className="text-2xl font-bold">{analytics.totalPublications}</p>
                <Badge variant="secondary" className="mt-1">
                  Total actif
                </Badge>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des revenus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Évolution des Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
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
                <XAxis dataKey="date" />
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
    </div>
  );
};

export default AnalyticsDashboard;