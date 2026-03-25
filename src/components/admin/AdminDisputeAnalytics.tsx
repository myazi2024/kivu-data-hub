import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Scale, TrendingUp, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { StatisticsCards, StatCard } from '@/components/shared/StatisticsCards';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];

interface Dispute {
  id: string;
  dispute_nature: string;
  dispute_type: string;
  current_status: string;
  resolution_level: string | null;
  created_at: string;
  dispute_start_date: string | null;
}

const NATURE_LABELS: Record<string, string> = {
  limite_terrain: 'Limite de terrain',
  revendication_propriete: 'Revendication de propriété',
  heritage_succession: 'Héritage / Succession',
  double_vente: 'Double vente',
  occupation_illegale: 'Occupation illégale',
  servitude: 'Servitude',
  empiètement: 'Empiètement',
  autre: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  familial: 'Familial',
  conciliation_amiable: 'Conciliation',
  autorite_locale: 'Autorité locale',
  arbitrage: 'Arbitrage',
  tribunal: 'Tribunal',
  appel: 'En appel',
  demande_levee: 'Demande levée',
  resolu: 'Résolu',
  leve: 'Levé',
};

const RESOLVED_STATUSES = ['resolu', 'leve', 'resolved', 'closed'];

const AdminDisputeAnalytics: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      const { data } = await supabase
        .from('cadastral_land_disputes')
        .select('id, dispute_nature, dispute_type, current_status, resolution_level, created_at, dispute_start_date');
      setDisputes((data as unknown as Dispute[]) || []);
      setLoading(false);
    };
    fetchDisputes();
  }, []);

  const analytics = useMemo(() => {
    const total = disputes.length;
    const signalements = disputes.filter(d => d.dispute_type === 'signalement').length;
    const levees = disputes.filter(d => d.dispute_type === 'levee').length;
    const resolved = disputes.filter(d => RESOLVED_STATUSES.includes(d.current_status)).length;
    const enCours = total - resolved;
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

    // Durée moyenne de résolution (jours)
    const resolvedWithDates = disputes.filter(d =>
      RESOLVED_STATUSES.includes(d.current_status) && d.dispute_start_date
    );
    let avgDays = 0;
    if (resolvedWithDates.length > 0) {
      const totalDays = resolvedWithDates.reduce((sum, d) => {
        const start = new Date(d.dispute_start_date!).getTime();
        const end = d.resolved_at ? new Date(d.resolved_at).getTime() : Date.now();
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / resolvedWithDates.length);
    }

    // Par nature
    const byNature: Record<string, number> = {};
    disputes.forEach(d => {
      const key = d.dispute_nature || 'autre';
      byNature[key] = (byNature[key] || 0) + 1;
    });
    const natureData = Object.entries(byNature)
      .map(([key, value]) => ({ name: NATURE_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);

    // Par niveau de résolution
    const byLevel: Record<string, number> = {};
    disputes.filter(d => d.resolution_level).forEach(d => {
      const key = d.resolution_level!;
      byLevel[key] = (byLevel[key] || 0) + 1;
    });
    const levelData = Object.entries(byLevel)
      .map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);

    // Tendance mensuelle
    const monthMap = new Map<string, { signalements: number; levees: number }>();
    disputes.forEach(d => {
      const month = d.created_at.slice(0, 7);
      if (!monthMap.has(month)) monthMap.set(month, { signalements: 0, levees: 0 });
      const entry = monthMap.get(month)!;
      if (d.dispute_type === 'levee') entry.levees++;
      else entry.signalements++;
    });
    const trendData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({ month, ...data }));

    // Par statut
    const statusPie = [
      { name: 'En cours', value: enCours },
      { name: 'Résolus', value: resolved },
    ];

    return { total, signalements, levees, resolved, enCours, resolutionRate, avgDays, natureData, levelData, trendData, statusPie };
  }, [disputes]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement...</div>;
  }

  const stats: StatCard[] = [
    { title: 'Total litiges', value: analytics.total, icon: Scale, iconColor: 'text-orange-500' },
    { title: 'Signalements', value: analytics.signalements, icon: AlertTriangle, iconColor: 'text-red-500' },
    { title: 'Levées', value: analytics.levees, icon: CheckCircle2, iconColor: 'text-green-500' },
    { title: 'En cours', value: analytics.enCours, icon: Clock, iconColor: 'text-blue-500' },
    { title: 'Taux résolution', value: `${analytics.resolutionRate}%`, icon: TrendingUp, iconColor: 'text-emerald-500' },
    { title: 'Durée moy. (j)', value: analytics.avgDays, icon: Clock, iconColor: 'text-purple-500' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Scale className="h-5 w-5 text-orange-500" />
        Analytics — Litiges fonciers
      </h2>

      <StatisticsCards stats={stats} columns={6} compact />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Répartition par nature */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Répartition par nature</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.natureData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.natureData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Statut résolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statut de résolution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={analytics.statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {analytics.statusPie.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#f97316' : '#22c55e'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendance mensuelle */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Évolution mensuelle (12 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="signalements" name="Signalements" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="levees" name="Levées" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Répartition par niveau de résolution */}
        {analytics.levelData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Répartition par niveau de résolution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.levelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {analytics.levelData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDisputeAnalytics;
