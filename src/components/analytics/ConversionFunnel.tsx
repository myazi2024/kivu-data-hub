import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { Filter, AlertCircle } from 'lucide-react';
import { FunnelData } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: FunnelData | null;
  loading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.5)', 'hsl(var(--primary) / 0.4)', 'hsl(var(--primary) / 0.3)'];

export const ConversionFunnel: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-64" />
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
          <p className="text-muted-foreground text-center">Aucune donnée de funnel disponible pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  const totalUsers = data.stages[0]?.users || 1;
  const convertedUsers = data.stages[data.stages.length - 1]?.users || 0;
  const overallConversion = (convertedUsers / totalUsers) * 100;

  return (
    <div className="space-y-6">
      {/* KPIs Globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taux de Conversion Global</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{overallConversion.toFixed(2)}%</p>
              </div>
              <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <Progress value={overallConversion} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Utilisateurs de Départ</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversions Finales</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{convertedUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualisation Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Tunnel de Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.stages.map((stage, index) => {
              const width = (stage.users / totalUsers) * 100;
              const isBottleneck = stage.dropoffRate > 40;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      <span className="font-medium">{stage.stage}</span>
                      {isBottleneck && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {stage.users.toLocaleString()} utilisateurs
                      </span>
                      <Badge variant={stage.conversionRate > 70 ? 'default' : 'secondary'} className="text-xs">
                        {stage.conversionRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="relative h-12 sm:h-16 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full flex items-center justify-center font-bold text-white transition-all duration-300"
                      style={{
                        width: `${width}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                        minWidth: '60px'
                      }}
                    >
                      {stage.users.toLocaleString()}
                    </div>
                  </div>
                  
                  {index < data.stages.length - 1 && (
                    <div className="flex items-center gap-2 text-xs pl-8">
                      <span className="text-destructive font-medium">
                        ↓ -{stage.dropoffRate.toFixed(1)}% abandons
                      </span>
                      {isBottleneck && (
                        <Badge variant="destructive" className="text-xs">
                          Point de friction
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analyse des Abandons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Taux de Conversion par Étape</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stages}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="stage" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Bar dataKey="conversionRate" fill="hsl(var(--primary))" name="Conversion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Taux d'Abandon par Étape</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stages.filter((_, idx) => idx < data.stages.length - 1)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="stage" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Bar dataKey="dropoffRate" fill="hsl(var(--destructive))" name="Abandon %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Points de Friction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Points de Friction Identifiés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.stages
              .filter((stage, idx) => idx < data.stages.length - 1 && stage.dropoffRate > 30)
              .sort((a, b) => b.dropoffRate - a.dropoffRate)
              .map((stage, index) => {
                const lostUsers = stage.users - (data.stages[data.stages.findIndex(s => s.stage === stage.stage) + 1]?.users || 0);
                const severity = stage.dropoffRate > 50 ? 'Critique' : stage.dropoffRate > 40 ? 'Élevé' : 'Moyen';
                
                return (
                  <div key={index} className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm sm:text-base">{stage.stage}</h4>
                          <Badge variant="destructive" className="text-xs">{severity}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <strong>{lostUsers.toLocaleString()}</strong> utilisateurs perdus 
                          ({stage.dropoffRate.toFixed(1)}% d'abandon)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Recommandation: Analyser cette étape en priorité pour améliorer la conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-destructive">
                          {stage.dropoffRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">taux d'abandon</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            {data.stages.filter((stage, idx) => idx < data.stages.length - 1 && stage.dropoffRate > 30).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                ✅ Aucun point de friction majeur détecté
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Recommandations d'Optimisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-sm sm:text-base">🎯 Optimiser le Tunnel</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Réduire les étapes avec un taux d'abandon supérieur à 40% pourrait améliorer 
                le taux de conversion global de {(overallConversion * 1.3).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-sm sm:text-base">📱 Mobile First</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Vérifier l'expérience mobile aux étapes critiques pour réduire les frictions
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-sm sm:text-base">⚡ Performance</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Améliorer la vitesse de chargement peut réduire les abandons de 5-10%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
