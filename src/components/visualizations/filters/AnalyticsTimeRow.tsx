/**
 * Time row of AnalyticsFilters: Year › Semester › Quarter › Month › Week + status.
 *
 * Pure presentational — receives the filter object + change handler from the
 * parent orchestrator. Status options are computed by the parent.
 */
import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, X } from 'lucide-react';
import { AnalyticsFilter } from '@/utils/analyticsHelpers';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface Props {
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  years: number[];
  hideStatus: boolean;
  statusOptions: string[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

const selectCls = 'h-6 text-[10px] w-auto min-w-[70px]';
const sep = <span className="text-[10px] text-muted-foreground">›</span>;

export const AnalyticsTimeRow: React.FC<Props> = ({
  filter, onChange, years, hideStatus, statusOptions, hasActiveFilters, onReset,
}) => {
  const semesterOptions = [1, 2];
  const quarterOptions = useMemo(() => {
    if (filter.semester === 1) return [1, 2];
    if (filter.semester === 2) return [3, 4];
    return [1, 2, 3, 4];
  }, [filter.semester]);
  const monthOptions = useMemo(() => {
    if (filter.quarter) {
      const start = (filter.quarter - 1) * 3 + 1;
      return [start, start + 1, start + 2];
    }
    if (filter.semester === 1) return [1, 2, 3, 4, 5, 6];
    if (filter.semester === 2) return [7, 8, 9, 10, 11, 12];
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [filter.semester, filter.quarter]);
  const weekOptions = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0">
        <Calendar className="h-2.5 w-2.5" /> Temps
      </Badge>

      <Select
        value={filter.year === null ? '__all__' : String(filter.year)}
        onValueChange={(v) =>
          onChange({
            ...filter,
            year: v === '__all__' ? null : Number(v),
            semester: undefined, quarter: undefined, month: undefined, week: undefined,
          })
        }
      >
        <SelectTrigger className={selectCls}><SelectValue placeholder="Année" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les années</SelectItem>
          {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
        </SelectContent>
      </Select>

      {filter.year !== null && (
        <>
          {sep}
          <Select
            value={filter.semester ? String(filter.semester) : '__all__'}
            onValueChange={(v) =>
              onChange({
                ...filter,
                semester: v === '__all__' ? undefined : Number(v),
                quarter: undefined, month: undefined, week: undefined,
              })
            }
          >
            <SelectTrigger className={selectCls}><SelectValue placeholder="Sem." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous sem.</SelectItem>
              {semesterOptions.map((s) => (<SelectItem key={s} value={String(s)}>S{s}</SelectItem>))}
            </SelectContent>
          </Select>

          {filter.semester && (
            <>
              {sep}
              <Select
                value={filter.quarter ? String(filter.quarter) : '__all__'}
                onValueChange={(v) =>
                  onChange({
                    ...filter,
                    quarter: v === '__all__' ? undefined : Number(v),
                    month: undefined, week: undefined,
                  })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Trim." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous trim.</SelectItem>
                  {quarterOptions.map((q) => (<SelectItem key={q} value={String(q)}>T{q}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.quarter && (
            <>
              {sep}
              <Select
                value={filter.month ? String(filter.month) : '__all__'}
                onValueChange={(v) =>
                  onChange({
                    ...filter,
                    month: v === '__all__' ? undefined : Number(v),
                    week: undefined,
                  })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Mois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous mois</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>{MONTHS[m - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.month && (
            <>
              {sep}
              <Select
                value={filter.week ? String(filter.week) : '__all__'}
                onValueChange={(v) =>
                  onChange({
                    ...filter,
                    week: v === '__all__' ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Sem." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes sem.</SelectItem>
                  {weekOptions.map((w) => (<SelectItem key={w} value={String(w)}>Sem. {w}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}
        </>
      )}

      {!hideStatus && statusOptions.length > 0 && (
        <>
          <div className="w-px h-4 bg-border/50" />
          <Select
            value={filter.status || '__all__'}
            onValueChange={(v) => onChange({ ...filter, status: v === '__all__' ? undefined : v })}
          >
            <SelectTrigger className={selectCls}>
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous statuts</SelectItem>
              {statusOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-0.5 ml-auto">
          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={onReset}>
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
