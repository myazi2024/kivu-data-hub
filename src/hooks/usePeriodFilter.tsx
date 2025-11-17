import { useState, useMemo } from 'react';
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type PeriodType = 'today' | '7days' | '30days' | 'month' | 'quarter' | 'year' | 'custom';

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

export const usePeriodFilter = () => {
  const [periodType, setPeriodType] = useState<PeriodType>('30days');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const periodRange = useMemo((): PeriodRange => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (periodType) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        previousEndDate = subDays(startDate, 1);
        previousStartDate = new Date(previousEndDate.setHours(0, 0, 0, 0));
        break;

      case '7days':
        startDate = subDays(now, 6);
        previousEndDate = subDays(startDate, 1);
        previousStartDate = subDays(previousEndDate, 6);
        break;

      case '30days':
        startDate = subDays(now, 29);
        previousEndDate = subDays(startDate, 1);
        previousStartDate = subDays(previousEndDate, 29);
        break;

      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        const prevMonth = subMonths(now, 1);
        previousStartDate = startOfMonth(prevMonth);
        previousEndDate = endOfMonth(prevMonth);
        break;

      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
        previousStartDate = subMonths(startDate, 3);
        previousEndDate = subMonths(endDate, 3);
        break;

      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        previousStartDate = subMonths(startDate, 12);
        previousEndDate = subMonths(endDate, 12);
        break;

      case 'custom':
        startDate = customStartDate || subDays(now, 29);
        endDate = customEndDate || now;
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        previousEndDate = subDays(startDate, 1);
        previousStartDate = subDays(previousEndDate, daysDiff);
        break;

      default:
        startDate = subDays(now, 29);
        previousEndDate = subDays(startDate, 1);
        previousStartDate = subDays(previousEndDate, 29);
    }

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }, [periodType, customStartDate, customEndDate]);

  return {
    periodType,
    setPeriodType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    periodRange,
  };
};
