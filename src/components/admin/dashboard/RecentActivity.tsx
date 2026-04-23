import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileCheck, DollarSign, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'contribution' | 'payment' | 'registration';
  description: string;
  timestamp: Date;
  status?: string;
  amount?: number;
  user?: string;
}

interface RecentActivityProps {
  loading: boolean;
  activities: ActivityItem[];
  onViewDetails?: (id: string, type: string) => void;
}

export function RecentActivity({ loading, activities, onViewDetails }: RecentActivityProps) {
  const [filter, setFilter] = useState<'all' | 'contribution' | 'payment' | 'registration'>('all');

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return <FileCheck className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'registration':
        return <UserPlus className="h-5 w-5 text-purple-500" />;
      default:
        return <FileCheck className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      paid: 'default',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm md:text-base">Activité récente</CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-[10px] px-2">Tout</TabsTrigger>
              <TabsTrigger value="contribution" className="text-[10px] px-2">Contrib</TabsTrigger>
              <TabsTrigger value="payment" className="text-[10px] px-2">Paiem.</TabsTrigger>
              <TabsTrigger value="registration" className="text-[10px] px-2">Inscr.</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente</p>
          ) : (
            filtered.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-0.5">{getIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(activity.timestamp, 'dd MMM yyyy HH:mm', { locale: fr })}
                    </span>
                    {activity.status && getStatusBadge(activity.status)}
                    {activity.amount && (
                      <span className="text-xs font-medium text-green-600">
                        ${activity.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {activity.user && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.user}</p>
                  )}
                </div>
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onViewDetails(activity.id, activity.type)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
