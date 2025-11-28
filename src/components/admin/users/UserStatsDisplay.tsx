import React, { useState } from 'react';
import { AdminUserStatistics } from '@/hooks/useAdminUserStatistics';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStatsDisplayProps {
  stats: AdminUserStatistics | null;
  loading?: boolean;
  onPeriodChange?: (startDate: Date, endDate: Date) => void;
}

export const UserStatsDisplay: React.FC<UserStatsDisplayProps> = ({ 
  stats, 
  loading,
  onPeriodChange 
}) => {
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleDateChange = () => {
    if (onPeriodChange) {
      onPeriodChange(startDate, endDate);
    }
  };

  if (loading) {
    return (
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm md:text-base">Statistiques</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="p-3 bg-muted rounded animate-pulse">
              <div className="h-3 bg-muted-foreground/20 rounded w-20 mb-2" />
              <div className="h-6 bg-muted-foreground/20 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const hasActivity = stats.total_invoices > 0 || 
                      stats.contributions_count > 0 || 
                      stats.ccc_codes_earned > 0;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm md:text-base">Statistiques</h4>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-7 text-xs">
              <Calendar className="w-3 h-3" />
              {format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yy', { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Date début</label>
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={fr}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Date fin</label>
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  locale={fr}
                />
              </div>
              <Button onClick={handleDateChange} size="sm" className="w-full">
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!hasActivity && (
        <div className="bg-muted/50 rounded-lg p-4 text-center mb-3">
          <p className="text-sm text-muted-foreground">
            Aucune activité détectée pour cette période
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Factures totales</p>
          <p className="text-lg md:text-xl font-bold">{stats.total_invoices || 0}</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-lg md:text-xl font-bold text-warning">{stats.pending_invoices || 0}</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="text-lg md:text-xl font-bold">{stats.total_spent || 0}$</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Services</p>
          <p className="text-lg md:text-xl font-bold">{stats.services_accessed || 0}</p>
        </div>
        <div className="p-3 bg-success/10 rounded">
          <p className="text-xs text-muted-foreground">Contributions</p>
          <p className="text-lg md:text-xl font-bold text-success">{stats.contributions_count || 0}</p>
        </div>
        <div className="p-3 bg-success/10 rounded">
          <p className="text-xs text-muted-foreground">Approuvées</p>
          <p className="text-lg md:text-xl font-bold text-success">{stats.approved_contributions || 0}</p>
        </div>
        <div className="p-3 bg-primary/10 rounded">
          <p className="text-xs text-muted-foreground">Codes CCC</p>
          <p className="text-lg md:text-xl font-bold text-primary">{stats.ccc_codes_earned || 0}</p>
        </div>
        <div className="p-3 bg-primary/10 rounded">
          <p className="text-xs text-muted-foreground">Valeur CCC</p>
          <p className="text-lg md:text-xl font-bold text-primary">{stats.ccc_value_earned || 0}$</p>
        </div>
        <div className="p-3 bg-primary/10 rounded">
          <p className="text-xs text-muted-foreground">Codes utilisés</p>
          <p className="text-lg md:text-xl font-bold text-primary">{stats.ccc_codes_used || 0}</p>
        </div>
      </div>
    </div>
  );
};
