import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  compact?: boolean;
}

interface StatisticsCardsProps {
  stats: StatCard[];
  columns?: 2 | 3 | 4 | 6;
  compact?: boolean;
}

export const StatisticsCards = ({ stats, columns = 4, compact = false }: StatisticsCardsProps) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-2 sm:gap-4`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className={compact ? 'p-3 sm:pb-2' : 'pb-2'}>
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.iconColor || ''}`} />
                {stat.compact ? (
                  <>
                    <span className="hidden sm:inline">{stat.title}</span>
                    <span className="sm:hidden">{stat.title.split(' ')[0]}</span>
                  </>
                ) : (
                  stat.title
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className={compact ? 'p-3' : ''}>
              <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
