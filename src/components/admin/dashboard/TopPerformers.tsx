import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Performer {
  id: string;
  name: string;
  value: number;
  subtitle?: string;
  rank: number;
}

interface TopPerformersProps {
  loading: boolean;
  topResellers?: Performer[];
  topUsers?: Performer[];
  topZones?: Performer[];
}

export function TopPerformers({ loading, topResellers = [], topUsers = [], topZones = [] }: TopPerformersProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Top Performers</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankBadge = (rank: number) => {
    const colors = {
      1: 'bg-yellow-500 text-white',
      2: 'bg-gray-400 text-white',
      3: 'bg-orange-600 text-white',
    };
    return colors[rank as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const renderPerformers = (performers: Performer[], icon: React.ReactNode, valuePrefix = '$') => (
    <div className="space-y-3">
      {performers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée disponible</p>
      ) : (
        performers.map((performer) => (
          <div key={performer.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Badge className={`${getRankBadge(performer.rank)} h-8 w-8 rounded-full flex items-center justify-center p-0`}>
              {performer.rank}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{performer.name}</p>
              {performer.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{performer.subtitle}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">
                {valuePrefix}{typeof performer.value === 'number' ? performer.value.toFixed(2) : performer.value}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-sm md:text-base">Top Performers</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <Tabs defaultValue="resellers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="resellers" className="text-xs">Revendeurs</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="zones" className="text-xs">Zones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="resellers">
            {renderPerformers(topResellers, <TrendingUp />, '$')}
          </TabsContent>
          
          <TabsContent value="users">
            {renderPerformers(topUsers, <TrendingUp />, '$')}
          </TabsContent>
          
          <TabsContent value="zones">
            {renderPerformers(topZones, <MapPin />, '')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
