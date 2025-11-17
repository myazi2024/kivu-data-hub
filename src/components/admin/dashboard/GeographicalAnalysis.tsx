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
        <CardHeader className="p-4 md:p-6">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <Skeleton className="h-64 w-full" />
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
    <div className="space-y-4">
      {/* Top Zones Map View */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Performance géographique
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topZones} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis 
                dataKey="zone" 
                type="category" 
                width={80}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ fontSize: 12 }}
                formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenus']}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {topZones.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHeatColor(entry.revenue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Zone Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        {topZones.map((zone, idx) => (
          <Card key={idx}>
            <CardHeader className="p-3 md:p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm truncate pr-2">{zone.zone}</CardTitle>
                <Badge variant={zone.growth > 0 ? "default" : "secondary"} className="text-[10px] shrink-0">
                  #{idx + 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Revenus</span>
                  <span className="text-sm md:text-base font-bold">${zone.revenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Transactions</span>
                  <span className="text-sm font-semibold">{zone.transactions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Croissance</span>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    zone.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${zone.growth < 0 ? 'rotate-180' : ''}`} />
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
