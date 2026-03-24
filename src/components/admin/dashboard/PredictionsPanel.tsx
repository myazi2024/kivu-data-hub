import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart } from 'recharts';
import { useState, useEffect } from 'react';

interface PredictionData {
  date: string;
  actual?: number;
  predicted: number;
  confidence: number;
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  date: string;
}

interface PredictionsPanelProps {
  loading?: boolean;
  historicalData?: Array<{ date: string; revenue: number }>;
}

export function PredictionsPanel({ loading = false, historicalData = [] }: PredictionsPanelProps) {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (historicalData.length > 0) {
      generatePredictions();
      detectAnomalies();
      generateRecommendations();
    }
  }, [historicalData]);

  const generatePredictions = () => {
    // Simple linear regression for prediction
    const lastValue = historicalData[historicalData.length - 1]?.revenue || 0;
    const trend = calculateTrend(historicalData);
    
    const futurePredictions: PredictionData[] = [];
    for (let i = 1; i <= 7; i++) {
      const predicted = lastValue + (trend * i);
      futurePredictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        confidence: Math.max(50, 95 - i * 5)
      });
    }
    setPredictions(futurePredictions);
  };

  const calculateTrend = (data: Array<{ date: string; revenue: number }>) => {
    if (data.length < 2) return 0;
    const values = data.map(d => d.revenue);
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  };

  const detectAnomalies = () => {
    if (historicalData.length < 7) return;
    
    const values = historicalData.map(d => d.revenue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    const detected: Anomaly[] = [];
    historicalData.forEach((point, idx) => {
      const zScore = Math.abs((point.revenue - mean) / stdDev);
      if (zScore > 2) {
        detected.push({
          type: point.revenue > mean ? 'spike' : 'drop',
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          message: point.revenue > mean 
            ? `Pic de revenus inhabituel: $${point.revenue.toFixed(2)}`
            : `Baisse inhabituelle: $${point.revenue.toFixed(2)}`,
          date: point.date
        });
      }
    });
    setAnomalies(detected.slice(-3));
  };

  const generateRecommendations = () => {
    const trend = calculateTrend(historicalData);
    const recos: string[] = [];
    
    if (trend > 0) {
      recos.push("📈 Tendance positive détectée - Maintenez vos efforts marketing");
      recos.push("💰 Envisagez d'augmenter la capacité pour répondre à la demande croissante");
    } else if (trend < 0) {
      recos.push("📉 Tendance négative - Analysez les causes de la baisse");
      recos.push("🎯 Lancez une campagne promotionnelle pour stimuler les ventes");
    }
    
    const lastWeekRevenue = historicalData.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
    const previousWeekRevenue = historicalData.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);
    
    if (lastWeekRevenue < previousWeekRevenue * 0.9) {
      recos.push("⚠️ Baisse de 10%+ cette semaine - Action requise");
    }
    
    setRecommendations(recos.slice(0, 3));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const combinedData = [
    ...historicalData.slice(-7).map(d => ({
      date: d.date,
      actual: d.revenue,
      predicted: null
    })),
    ...predictions.map(p => ({
      date: p.date,
      actual: null,
      predicted: p.predicted
    }))
  ];

  const severityColors = {
    low: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    medium: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    high: 'bg-red-500/10 text-red-600 border-red-500/20'
  };

  return (
    <div className="space-y-4">
      {/* Predictions Chart */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prévisions statistiques - 7 prochains jours
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Basé sur une régression linéaire simple — à titre indicatif uniquement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ fontSize: 12 }}
                formatter={(value: any) => [`$${value?.toFixed(2)}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Réel"
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--secondary))" 
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorPredicted)"
                name="Prévu"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies and Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Anomalies */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Anomalies détectées
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-2">
            {anomalies.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground">Aucune anomalie détectée</p>
            ) : (
              anomalies.map((anomaly, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${severityColors[anomaly.severity]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium truncate">{anomaly.message}</p>
                      <p className="text-[10px] md:text-xs opacity-75 mt-1">
                        {new Date(anomaly.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {anomaly.severity}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Smart Recommendations */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recommandations statistiques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-2">
            {recommendations.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground">Aucune recommandation</p>
            ) : (
              recommendations.map((reco, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs md:text-sm">{reco}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
