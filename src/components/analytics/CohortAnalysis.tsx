import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { CohortData } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: CohortData | null;
  loading: boolean;
}

export const CohortAnalysis: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Aucune donnée de cohorte disponible pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  // Préparer les données de rétention pour le graphique
  const retentionData = data.cohorts[0]?.retention.map((r, idx) => {
    const dataPoint: any = { period: r.period };
    data.cohorts.forEach((cohort, cohortIdx) => {
      dataPoint[cohort.cohort] = cohort.retention[idx]?.rate || 0;
    });
    return dataPoint;
  }) || [];

  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Vue d'Ensemble des Cohortes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.cohorts.map((cohort, index) => (
          <Card key={index}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs">{cohort.cohort}</Badge>
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taille</p>
                <p className="text-xl sm:text-2xl font-bold">{cohort.size}</p>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">LTV</p>
                <p className="text-sm font-medium">${cohort.ltv.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique de Rétention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Courbes de Rétention par Cohorte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
              {data.cohorts.map((cohort, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={cohort.cohort}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  name={cohort.cohort}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* LTV par Cohorte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Lifetime Value par Cohorte</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.cohorts}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="cohort" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              <Bar dataKey="ltv" fill="hsl(var(--primary))" name="LTV ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Matrice de Rétention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Matrice de Rétention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-xs sm:text-sm text-left bg-muted">Cohorte</th>
                  <th className="border p-2 text-xs sm:text-sm bg-muted">Taille</th>
                  {data.cohorts[0]?.retention.map((r, idx) => (
                    <th key={idx} className="border p-2 text-xs bg-muted">{r.period}</th>
                  ))}
                  <th className="border p-2 text-xs sm:text-sm bg-muted">LTV</th>
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort, cohortIdx) => (
                  <tr key={cohortIdx} className="hover:bg-muted/50">
                    <td className="border p-2 font-medium text-xs sm:text-sm">{cohort.cohort}</td>
                    <td className="border p-2 text-center text-xs sm:text-sm">{cohort.size}</td>
                    {cohort.retention.map((ret, retIdx) => {
                      const rate = ret.rate;
                      const intensity = rate / 100;
                      return (
                        <td 
                          key={retIdx} 
                          className="border p-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: `hsl(var(--primary) / ${intensity * 0.8})`
                          }}
                        >
                          {rate.toFixed(0)}%
                        </td>
                      );
                    })}
                    <td className="border p-2 text-center text-xs sm:text-sm font-bold">
                      ${cohort.ltv.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            💡 Les cellules plus foncées indiquent des taux de rétention plus élevés
          </p>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Insights Cohortes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.cohorts.map((cohort, index) => {
              const week4Retention = cohort.retention[3]?.rate || 0;
              const qualite = week4Retention > 60 ? 'Excellente' : week4Retention > 40 ? 'Bonne' : 'À améliorer';
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm sm:text-base">{cohort.cohort}</h4>
                        <Badge variant="outline" className="text-xs">{cohort.size} users</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Rétention à 4 semaines: <strong>{week4Retention.toFixed(1)}%</strong> - {qualite}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Valeur vie client: <strong>${cohort.ltv.toFixed(0)}</strong>
                      </p>
                    </div>
                    <Badge 
                      variant={week4Retention > 60 ? 'default' : week4Retention > 40 ? 'secondary' : 'outline'}
                      className="self-start sm:self-auto text-xs"
                    >
                      {qualite}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
