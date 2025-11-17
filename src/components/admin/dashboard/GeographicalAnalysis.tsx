import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface ZoneData {
  zone: string;
  revenue: number;
  transactions: number;
  growth: number;
}

interface GeographicalAnalysisProps {
  loading?: boolean;
  zonesData?: ZoneData[];
}

export function GeographicalAnalysis({ loading = false, zonesData = [] }: GeographicalAnalysisProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-4">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <Skeleton className="h-48 sm:h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Sort by revenue
  const sortedZones = [...zonesData].sort((a, b) => b.revenue - a.revenue);
  const topZones = sortedZones.slice(0, 5);

  const getHeatColor = (revenue: number) => {
    const maxRevenue = Math.max(...zonesData.map(z => z.revenue));
    const intensity = (revenue / maxRevenue) * 100;
    
    if (intensity > 75) return 'hsl(var(--primary))';
    if (intensity > 50) return 'hsl(var(--secondary))';
    if (intensity > 25) return 'hsl(var(--accent))';
    return 'hsl(var(--muted))';
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Top Zones Map View */}
      <Card>
        <CardHeader className="p-2 sm:p-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Performance géographique
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topZones} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis 
                dataKey="zone" 
                type="category" 
                width={60}
                tick={{ fontSize: 9 }}
              />
              <Tooltip 
                contentStyle={{ fontSize: 10 }}
                formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenus']}
              />
              <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
                {topZones.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHeatColor(entry.revenue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Zone Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
        {topZones.map((zone, idx) => (
          <Card key={idx}>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-[11px] sm:text-xs truncate flex-1">{zone.zone}</CardTitle>
                <Badge variant={zone.growth > 0 ? "default" : "secondary"} className="text-[9px] sm:text-[10px] shrink-0 px-1.5 py-0">
                  #{idx + 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Revenus</span>
                  <span className="text-xs sm:text-sm font-bold">${zone.revenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Transactions</span>
                  <span className="text-xs sm:text-sm font-semibold">{zone.transactions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Croissance</span>
                  <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold ${
                    zone.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${zone.growth < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(zone.growth).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
