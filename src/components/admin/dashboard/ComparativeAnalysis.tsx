import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

interface ComparisonData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  unit: string;
}

interface ComparativeAnalysisProps {
  loading?: boolean;
  currentPeriodData?: {
    revenue: number;
    transactions: number;
    avgTransaction: number;
    newUsers: number;
  };
  previousPeriodData?: {
    revenue: number;
    transactions: number;
    avgTransaction: number;
    newUsers: number;
  };
}

export function ComparativeAnalysis({ 
  loading = false,
  currentPeriodData,
  previousPeriodData 
}: ComparativeAnalysisProps) {
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

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const comparisons: ComparisonData[] = [
    {
      metric: 'Revenus',
      current: currentPeriodData?.revenue || 0,
      previous: previousPeriodData?.revenue || 0,
      change: calculateChange(currentPeriodData?.revenue || 0, previousPeriodData?.revenue || 0),
      unit: '$'
    },
    {
      metric: 'Transactions',
      current: currentPeriodData?.transactions || 0,
      previous: previousPeriodData?.transactions || 0,
      change: calculateChange(currentPeriodData?.transactions || 0, previousPeriodData?.transactions || 0),
      unit: ''
    },
    {
      metric: 'Moy. transaction',
      current: currentPeriodData?.avgTransaction || 0,
      previous: previousPeriodData?.avgTransaction || 0,
      change: calculateChange(currentPeriodData?.avgTransaction || 0, previousPeriodData?.avgTransaction || 0),
      unit: '$'
    },
    {
      metric: 'Nouveaux users',
      current: currentPeriodData?.newUsers || 0,
      previous: previousPeriodData?.newUsers || 0,
      change: calculateChange(currentPeriodData?.newUsers || 0, previousPeriodData?.newUsers || 0),
      unit: ''
    }
  ];

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3 md:h-4 md:w-4" />;
    if (change < 0) return <ArrowDown className="h-3 w-3 md:h-4 md:w-4" />;
    return <Minus className="h-3 w-3 md:h-4 md:w-4" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const chartData = comparisons.map(c => ({
    metric: c.metric,
    'Période actuelle': c.current,
    'Période précédente': c.previous
  }));

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-sm md:text-base">Analyse comparative</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 md:h-10">
            <TabsTrigger value="table" className="text-xs md:text-sm">Tableau</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs md:text-sm">Graphique</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-4">
            <div className="space-y-3">
              {comparisons.map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">{comp.metric}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {comp.unit}{comp.previous.toFixed(2)}
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">→</span>
                      <span className="text-xs md:text-sm font-semibold">
                        {comp.unit}{comp.current.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${getChangeColor(comp.change)} shrink-0`}>
                    {getChangeIcon(comp.change)}
                    <span className="text-xs md:text-sm font-semibold">
                      {Math.abs(comp.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="chart" className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Période actuelle" fill="hsl(var(--primary))" />
                <Bar dataKey="Période précédente" fill="hsl(var(--muted))" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
