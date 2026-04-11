import React, { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { TrendingUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  title: string;
  records: any[];
  hidden?: boolean;
}

const TOUS_KEY = '__tous__';

export const DisputeEvolutionChart: React.FC<Props> = memo(({ title, records, hidden }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set([TOUS_KEY]));

  const { natures, dataByNature, dataAll } = useMemo(() => {
    const natSet = new Set<string>();
    const map = new Map<string, Map<string, number>>();
    const allMap = new Map<string, number>();

    records.forEach(r => {
      if (!r.created_at) return;
      const dt = new Date(r.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const nature = r.dispute_nature || '(Non renseigné)';
      natSet.add(nature);

      allMap.set(key, (allMap.get(key) || 0) + 1);

      if (!map.has(nature)) map.set(nature, new Map());
      const nm = map.get(nature)!;
      nm.set(key, (nm.get(key) || 0) + 1);
    });

    const months = Array.from(new Set([...allMap.keys(), ...Array.from(map.values()).flatMap(m => [...m.keys()])])).sort();
    const natures = Array.from(natSet).sort();

    const dataByNature = months.map(key => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      const row: Record<string, any> = { name };
      natures.forEach(n => { row[n] = map.get(n)?.get(key) || 0; });
      return row;
    });

    const dataAll = months.map(key => {
      const [y, m] = key.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value: allMap.get(key) || 0 };
    });

    return { natures, dataByNature, dataAll };
  }, [records]);

  const toggleTous = () => {
    setSelected(prev => {
      if (prev.has(TOUS_KEY)) {
        return new Set();
      }
      return new Set([TOUS_KEY]);
    });
  };

  const toggleNature = (nature: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(TOUS_KEY);
      if (next.has(nature)) next.delete(nature); else next.add(nature);
      if (next.size === 0) next.add(TOUS_KEY);
      return next;
    });
  };

  if (hidden) return null;

  const isTous = selected.has(TOUS_KEY);
  const colorMap = new Map<string, string>();
  natures.forEach((n, i) => colorMap.set(n, CHART_COLORS[i % CHART_COLORS.length]));

  const chartData = isTous ? dataAll : dataByNature;
  const hasData = chartData.length >= 2;

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </CardTitle>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <Checkbox checked={isTous} onCheckedChange={toggleTous} className="h-3.5 w-3.5" />
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[4] }} />
            Tous
          </label>
          {natures.map(n => (
            <label key={n} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <Checkbox checked={!isTous && selected.has(n)} onCheckedChange={() => toggleNature(n)} className="h-3.5 w-3.5" />
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colorMap.get(n) }} />
              {n}
            </label>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pb-2 px-1">
        {!hasData ? <NoData /> : (
          <ResponsiveContainer width="100%" height={BASE_CH}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              {isTous ? (
                <Area type="monotone" dataKey="value" name="Tous" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.15} strokeWidth={2} />
              ) : (
                Array.from(selected).map(n => (
                  <Area key={n} type="monotone" dataKey={n} name={n} stroke={colorMap.get(n)!} fill={colorMap.get(n)!} fillOpacity={0.1} strokeWidth={2} />
                ))
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
