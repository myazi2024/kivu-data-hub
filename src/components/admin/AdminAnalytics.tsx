import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Download } from 'lucide-react';

interface AnalyticsData {
  dailyRevenue: Array<{ date: string; revenue: number; downloads: number }>;
  topPublications: Array<{ title: string; downloads: number; revenue: number }>;
  paymentMethods: Array<{ method: string; count: number; value: number }>;
  userGrowth: Array<{ month: string; users: number }>;
}

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    dailyRevenue: [],
    topPublications: [],
    paymentMethods: [],
    userGrowth: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Fetch daily revenue and downloads
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_usd, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: downloads } = await supabase
        .from('publication_downloads')
        .select('downloaded_at')
        .gte('downloaded_at', startDate.toISOString())
        .lte('downloaded_at', endDate.toISOString());

      // Process daily revenue
      const dailyData: { [key: string]: { revenue: number; downloads: number } } = {};
      
      payments?.forEach(payment => {
        if (payment.status === 'completed') {
          const date = new Date(payment.created_at).toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, downloads: 0 };
          }
          dailyData[date].revenue += payment.amount_usd || 0;
        }
      });

      downloads?.forEach(download => {
        const date = new Date(download.downloaded_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, downloads: 0 };
        }
        dailyData[date].downloads += 1;
      });

      const dailyRevenue = Object.entries(dailyData)
        .map(([date, values]) => ({
          date,
          revenue: values.revenue,
          downloads: values.downloads
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Fetch top publications
      const { data: topPubs } = await supabase
        .from('publications')
        .select('title, download_count')
        .order('download_count', { ascending: false })
        .limit(5);

      const topPublications = topPubs?.map(pub => ({
        title: pub.title.substring(0, 30) + (pub.title.length > 30 ? '...' : ''),
        downloads: pub.download_count,
        revenue: pub.download_count * 10 // Estimation
      })) || [];

      // Fetch payment methods
      const { data: paymentData } = await supabase
        .from('payments')
        .select('payment_provider, amount_usd, status')
        .eq('status', 'completed');

      const methodData: { [key: string]: { count: number; value: number } } = {};
      paymentData?.forEach(payment => {
        const method = payment.payment_provider || 'mobile_money';
        if (!methodData[method]) {
          methodData[method] = { count: 0, value: 0 };
        }
        methodData[method].count += 1;
        methodData[method].value += payment.amount_usd || 0;
      });

      const paymentMethods = Object.entries(methodData).map(([method, data]) => ({
        method: method.replace('_', ' ').toUpperCase(),
        count: data.count,
        value: data.value
      }));

      // Fetch user growth (last 6 months)
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString());

      const monthlyUsers: { [key: string]: number } = {};
      users?.forEach(user => {
        const month = new Date(user.created_at).toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlyUsers[month] = (monthlyUsers[month] || 0) + 1;
      });

      const userGrowth = Object.entries(monthlyUsers).map(([month, users]) => ({
        month,
        users
      }));

      setData({
        dailyRevenue,
        topPublications,
        paymentMethods,
        userGrowth
      });
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div>Chargement des analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue and Downloads Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenus et Téléchargements par Jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenus ($)" />
              <Line yAxisId="right" type="monotone" dataKey="downloads" stroke="#82ca9d" name="Téléchargements" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Publications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Publications les Plus Téléchargées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topPublications} barCategoryGap="-60%" barGap={-6} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="downloads" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Méthodes de Paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, count }) => `${method}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Croissance des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.userGrowth} barCategoryGap="-60%" barGap={-6} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;