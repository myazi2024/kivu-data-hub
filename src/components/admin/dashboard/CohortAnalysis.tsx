import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CohortData {
  cohort: string;
  users: number;
  retention: Array<{ period: string; rate: number }>;
}

interface CohortAnalysisProps {
  loading?: boolean;
  cohorts?: CohortData[];
}

export function CohortAnalysis({ loading = false, cohorts = [] }: CohortAnalysisProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Prepare retention data for chart
  const retentionData = cohorts.length > 0
    ? cohorts[0].retention.map((period, idx) => {
        const dataPoint: any = { period: period.period };
        cohorts.forEach((cohort) => {
          dataPoint[cohort.cohort] = cohort.retention[idx]?.rate || 0;
        });
        return dataPoint;
      })
    : [];

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--destructive))',
    'hsl(var(--muted))'
  ];

  return (
    <div className="space-y-4">
      {/* Cohort Summary */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cohorts.slice(0, 5).map((cohort, idx) => (
          <Card key={idx}>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">
                Cohorte {cohort.cohort}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                <span className="text-sm md:text-base font-bold">{cohort.users}</span>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                utilisateurs
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Retention Chart */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Courbes de rétention par cohorte
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {retentionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: any) => [`${value.toFixed(1)}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {cohorts.map((cohort, idx) => (
                  <Line
                    key={cohort.cohort}
                    type="monotone"
                    dataKey={cohort.cohort}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
              Aucune donnée de cohorte
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cohort Details Table */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Détail des cohortes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Cohorte</th>
                  <th className="text-right p-2 font-medium">Users</th>
                  <th className="text-right p-2 font-medium">Sem 1</th>
                  <th className="text-right p-2 font-medium">Sem 2</th>
                  <th className="text-right p-2 font-medium">Sem 4</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{cohort.cohort}</td>
                    <td className="p-2 text-right font-semibold">{cohort.users}</td>
                    <td className="p-2 text-right">
                      {cohort.retention[0]?.rate.toFixed(1) || '0.0'}%
                    </td>
                    <td className="p-2 text-right">
                      {cohort.retention[1]?.rate.toFixed(1) || '0.0'}%
                    </td>
                    <td className="p-2 text-right">
                      {cohort.retention[3]?.rate.toFixed(1) || '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
