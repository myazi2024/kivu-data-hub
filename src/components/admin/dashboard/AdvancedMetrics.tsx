import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, DollarSign, Percent, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Metric {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ElementType;
  description?: string;
}

interface AdvancedMetricsProps {
  loading: boolean;
  metrics: {
    conversionRate?: number;
    avgProcessingTime?: number;
    avgTransactionValue?: number;
    cccUsageRate?: number;
    revenuePerReseller?: number;
    activeResellers?: number;
  };
}

export function AdvancedMetrics({ loading, metrics }: AdvancedMetricsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2 p-3 md:p-4">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const advancedStats: Metric[] = [
    {
      title: 'Taux de conversion',
      value: `${(metrics.conversionRate || 0).toFixed(1)}%`,
      icon: Percent,
      description: 'Factures payées'
    },
    {
      title: 'Temps moyen traitement',
      value: `${(metrics.avgProcessingTime || 0).toFixed(0)}h`,
      icon: Clock,
      description: 'Pour contributions'
    },
    {
      title: 'Valeur moyenne transaction',
      value: `$${(metrics.avgTransactionValue || 0).toFixed(2)}`,
      icon: DollarSign,
      description: 'Par facture'
    },
    {
      title: 'Taux utilisation CCC',
      value: `${(metrics.cccUsageRate || 0).toFixed(1)}%`,
      icon: Percent,
      description: 'Codes utilisés'
    },
    {
      title: 'Revenu par revendeur',
      value: `$${(metrics.revenuePerReseller || 0).toFixed(2)}`,
      icon: DollarSign,
      description: 'Moyenne'
    },
    {
      title: 'Revendeurs actifs',
      value: metrics.activeResellers || 0,
      icon: Users,
      description: 'Ce mois'
    }
  ];

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {advancedStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate pr-1">
                {stat.title}
              </CardTitle>
              <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-lg md:text-xl font-bold truncate">{stat.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
