import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PeriodType } from '@/hooks/usePeriodFilter';

interface PeriodFilterProps {
  periodType: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomStartDateChange?: (date: Date | undefined) => void;
  onCustomEndDateChange?: (date: Date | undefined) => void;
}

export function PeriodFilter({
  periodType,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select value={periodType} onValueChange={(value) => onPeriodChange(value as PeriodType)}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Sélectionner une période" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Aujourd'hui</SelectItem>
          <SelectItem value="7days">7 derniers jours</SelectItem>
          <SelectItem value="30days">30 derniers jours</SelectItem>
          <SelectItem value="month">Ce mois-ci</SelectItem>
          <SelectItem value="quarter">Ce trimestre</SelectItem>
          <SelectItem value="year">Cette année</SelectItem>
          <SelectItem value="custom">Personnalisé</SelectItem>
        </SelectContent>
      </Select>

      {periodType === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, 'dd MMM yyyy', { locale: fr }) : 'Date début'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={onCustomStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, 'dd MMM yyyy', { locale: fr }) : 'Date fin'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={onCustomEndDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
