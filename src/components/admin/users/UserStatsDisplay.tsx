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
    // Validate dates
    if (startDate > endDate) {
      return; // Don't apply invalid date range
    }
    
    if (onPeriodChange) {
      onPeriodChange(startDate, endDate);
    }
  };

  const isDateRangeValid = startDate <= endDate;

  if (loading) {
    return (
      <div className="border-t pt-3">
        <h4 className="font-semibold mb-2 text-xs md:text-sm">Statistiques</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 md:gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="p-2 bg-muted rounded animate-pulse">
              <div className="h-2.5 bg-muted-foreground/20 rounded w-16 mb-1.5" />
              <div className="h-5 bg-muted-foreground/20 rounded w-10" />
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
    <div className="border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-xs md:text-sm">Statistiques</h4>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Calendar className="w-2.5 h-2.5" />
              <span className="text-[10px]">{format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yy', { locale: fr })}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-2 space-y-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block">Date début</label>
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={fr}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block">Date fin</label>
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  locale={fr}
                />
              </div>
              {!isDateRangeValid && (
                <p className="text-[10px] text-destructive">
                  La date de début doit être antérieure à la date de fin
                </p>
              )}
              <Button 
                onClick={handleDateChange} 
                size="sm" 
                className="w-full h-7 text-xs"
                disabled={!isDateRangeValid}
              >
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!hasActivity && (
        <div className="bg-muted/50 rounded-lg p-2 text-center mb-2">
          <p className="text-xs text-muted-foreground">
            Aucune activité détectée pour cette période
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 md:gap-2">
        <div className="p-2 bg-muted rounded">
          <p className="text-[10px] text-muted-foreground">Factures totales</p>
          <p className="text-base md:text-lg font-bold">{stats.total_invoices || 0}</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-[10px] text-muted-foreground">En attente</p>
          <p className="text-base md:text-lg font-bold text-warning">{stats.pending_invoices || 0}</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-[10px] text-muted-foreground">Dépenses</p>
          <p className="text-base md:text-lg font-bold">{stats.total_spent || 0}$</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-[10px] text-muted-foreground">Services</p>
          <p className="text-base md:text-lg font-bold">{stats.services_accessed || 0}</p>
        </div>
        <div className="p-2 bg-success/10 rounded">
          <p className="text-[10px] text-muted-foreground">Contributions</p>
          <p className="text-base md:text-lg font-bold text-success">{stats.contributions_count || 0}</p>
        </div>
        <div className="p-2 bg-success/10 rounded">
          <p className="text-[10px] text-muted-foreground">Approuvées</p>
          <p className="text-base md:text-lg font-bold text-success">{stats.approved_contributions || 0}</p>
        </div>
        <div className="p-2 bg-primary/10 rounded">
          <p className="text-[10px] text-muted-foreground">Codes CCC</p>
          <p className="text-base md:text-lg font-bold text-primary">{stats.ccc_codes_earned || 0}</p>
        </div>
        <div className="p-2 bg-primary/10 rounded">
          <p className="text-[10px] text-muted-foreground">Valeur CCC</p>
          <p className="text-base md:text-lg font-bold text-primary">{stats.ccc_value_earned || 0}$</p>
        </div>
        <div className="p-2 bg-primary/10 rounded">
          <p className="text-[10px] text-muted-foreground">Codes utilisés</p>
          <p className="text-base md:text-lg font-bold text-primary">{stats.ccc_codes_used || 0}</p>
        </div>
      </div>
    </div>
  );
};
