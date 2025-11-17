import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, Lightbulb, Activity } from 'lucide-react';
import { PredictiveData } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: PredictiveData | null;
  loading: boolean;
}

export const PredictiveAnalytics: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
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

  if (!data) return null;

  const avgConfidence = data.revenueForecast.reduce((sum, d) => sum + d.confidence, 0) / data.revenueForecast.length;
  const totalPredicted = data.revenueForecast.reduce((sum, d) => sum + d.predicted, 0);

  return (
    <div className="space-y-6">
      {/* KPIs Prédictifs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenus Prévus (30j)</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">
                  ${totalPredicted.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <Badge variant="secondary" className="mt-3 text-xs">
              Prévision basée sur ML
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Confiance Moyenne</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{avgConfidence.toFixed(1)}%</p>
              </div>
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Anomalies Détectées</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.anomalies.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prévisions de Revenus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Prévisions de Revenus (30 prochains jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data.revenueForecast}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value: any) => [`$${value.toFixed(0)}`, 'Revenus Prévus']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorPredicted)" 
                name="Prévision"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-4">
            📊 Prévisions générées par algorithme d'apprentissage automatique basé sur l'historique
          </p>
        </CardContent>
      </Card>

      {/* Confiance des Prévisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Niveau de Confiance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.revenueForecast}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Confiance']} />
              <Line 
                type="monotone" 
                dataKey="confidence" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                name="Niveau de Confiance"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies Détectées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Anomalies Détectées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.anomalies.map((anomaly, index) => (
              <Alert 
                key={index}
                variant={anomaly.severity === 'warning' ? 'destructive' : 'default'}
                className="text-xs sm:text-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={anomaly.severity === 'warning' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {anomaly.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{anomaly.date}</span>
                      </div>
                      <p className="text-xs sm:text-sm">{anomaly.description}</p>
                    </div>
                    <Badge variant="outline" className="self-start sm:self-auto text-xs">
                      {anomaly.severity}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommandations Intelligentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Recommandations Intelligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recommendations.map((rec, index) => {
              const priorityColors = {
                high: 'destructive',
                medium: 'default',
                low: 'secondary'
              };
              
              return (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={priorityColors[rec.priority as keyof typeof priorityColors] as any}
                          className="text-xs"
                        >
                          {rec.priority === 'high' ? '🔴 Priorité Haute' : 
                           rec.priority === 'medium' ? '🟡 Priorité Moyenne' : 
                           '🟢 Priorité Basse'}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">{rec.action}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Impact estimé: {rec.impact}
                      </p>
                    </div>
                    <Lightbulb className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Méthodologie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Méthodologie Prédictive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                <strong>Machine Learning:</strong> Utilisation d'algorithmes de régression pour analyser 
                les tendances historiques et générer des prévisions
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                <strong>Détection d'Anomalies:</strong> Identification automatique de comportements 
                inhabituels par analyse statistique
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                <strong>Recommandations:</strong> Suggestions générées en fonction des patterns 
                détectés et des meilleures pratiques du secteur
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
