import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, MapPin, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsFilter, defaultFilter, extractUnique, getAvailableYears } from '@/utils/analyticsHelpers';

interface Props {
  data: any[];
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  dateField?: string;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export const AnalyticsFilters: React.FC<Props> = ({ data, filter, onChange, dateField = 'created_at' }) => {
  const years = useMemo(() => getAvailableYears(data, dateField), [data, dateField]);

  const filteredData = useMemo(() => {
    let d = data;
    if (filter.province) d = d.filter(r => r.province === filter.province);
    if (filter.ville) d = d.filter(r => r.ville === filter.ville);
    if (filter.commune) d = d.filter(r => r.commune === filter.commune);
    if (filter.quartier) d = d.filter(r => r.quartier === filter.quartier);
    if (filter.territoire) d = d.filter(r => r.territoire === filter.territoire);
    if (filter.collectivite) d = d.filter(r => r.collectivite === filter.collectivite);
    if (filter.groupement) d = d.filter(r => r.groupement === filter.groupement);
    return d;
  }, [data, filter]);

  const provinces = useMemo(() => extractUnique(data, 'province'), [data]);
  const villes = useMemo(() => extractUnique(filter.province ? data.filter(r => r.province === filter.province) : data, 'ville'), [data, filter.province]);
  const communes = useMemo(() => extractUnique(filter.ville ? data.filter(r => r.ville === filter.ville) : data, 'commune'), [data, filter.ville]);
  const quartiers = useMemo(() => extractUnique(filteredData, 'quartier'), [filteredData]);
  const avenues = useMemo(() => extractUnique(filteredData, 'avenue'), [filteredData]);
  const territoires = useMemo(() => extractUnique(filter.province ? data.filter(r => r.province === filter.province) : data, 'territoire'), [data, filter.province]);
  const collectivites = useMemo(() => extractUnique(filter.territoire ? data.filter(r => r.territoire === filter.territoire) : data, 'collectivite'), [data, filter.territoire]);
  const groupements = useMemo(() => extractUnique(filteredData, 'groupement'), [filteredData]);
  const villages = useMemo(() => extractUnique(filteredData, 'village'), [filteredData]);

  const hasActiveFilters = filter.periodType !== 'all' || filter.sectionType !== 'all' || filter.ville || filter.territoire || filter.province;
  const reset = () => onChange({ ...defaultFilter });

  const selectCls = "h-6 text-[10px] w-auto min-w-[70px]";

  return (
    <div className="space-y-1 bg-muted/30 rounded-md p-1.5 border border-border/30">
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0"><Filter className="h-2.5 w-2.5" /> Filtres</Badge>

        <Select value={filter.periodType} onValueChange={v => onChange({ ...filter, periodType: v as any, year: undefined, subPeriod: undefined })}>
          <SelectTrigger className={selectCls}><Calendar className="h-2.5 w-2.5 mr-0.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute période</SelectItem>
            <SelectItem value="year">Année</SelectItem>
            <SelectItem value="semester">Semestre</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="month">Mois</SelectItem>
          </SelectContent>
        </Select>

        {filter.periodType !== 'all' && years.length > 0 && (
          <Select value={String(filter.year || '')} onValueChange={v => onChange({ ...filter, year: Number(v), subPeriod: undefined })}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {filter.periodType === 'semester' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Sem." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">S1</SelectItem>
              <SelectItem value="2">S2</SelectItem>
            </SelectContent>
          </Select>
        )}

        {filter.periodType === 'quarter' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Trim." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">T1</SelectItem>
              <SelectItem value="2">T2</SelectItem>
              <SelectItem value="3">T3</SelectItem>
              <SelectItem value="4">T4</SelectItem>
            </SelectContent>
          </Select>
        )}

        {filter.periodType === 'month' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Mois" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )}

        <div className="w-px h-4 bg-border/50" />

        <Select value={filter.sectionType} onValueChange={v => onChange({ ...filter, sectionType: v as any, ville: undefined, commune: undefined, quartier: undefined, avenue: undefined, territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
          <SelectTrigger className={selectCls}><MapPin className="h-2.5 w-2.5 mr-0.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="urbaine">Urbaine</SelectItem>
            <SelectItem value="rurale">Rurale</SelectItem>
          </SelectContent>
        </Select>

        {provinces.length > 0 && (
          <Select value={filter.province || '__all__'} onValueChange={v => onChange({ ...filter, province: v === '__all__' ? undefined : v, ville: undefined, commune: undefined, quartier: undefined, avenue: undefined, territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">Toutes prov.</SelectItem>{provinces.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={reset}><X className="h-2.5 w-2.5" /></Button>
        )}
      </div>

      {(filter.sectionType === 'urbaine' || filter.sectionType === 'all') && (villes.length > 0 || communes.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap pl-2">
          <span className="text-[10px] text-muted-foreground">U:</span>
          {villes.length > 0 && (
            <Select value={filter.ville || '__all__'} onValueChange={v => onChange({ ...filter, ville: v === '__all__' ? undefined : v, commune: undefined, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.ville && communes.length > 0 && (
            <Select value={filter.commune || '__all__'} onValueChange={v => onChange({ ...filter, commune: v === '__all__' ? undefined : v, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Commune" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{communes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.commune && quartiers.length > 0 && (
            <Select value={filter.quartier || '__all__'} onValueChange={v => onChange({ ...filter, quartier: v === '__all__' ? undefined : v, avenue: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Quartier" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{quartiers.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.quartier && avenues.length > 0 && (
            <Select value={filter.avenue || '__all__'} onValueChange={v => onChange({ ...filter, avenue: v === '__all__' ? undefined : v })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Avenue" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{avenues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}

      {(filter.sectionType === 'rurale' || filter.sectionType === 'all') && (territoires.length > 0 || collectivites.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap pl-2">
          <span className="text-[10px] text-muted-foreground">R:</span>
          {territoires.length > 0 && (
            <Select value={filter.territoire || '__all__'} onValueChange={v => onChange({ ...filter, territoire: v === '__all__' ? undefined : v, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Territoire" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{territoires.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.territoire && collectivites.length > 0 && (
            <Select value={filter.collectivite || '__all__'} onValueChange={v => onChange({ ...filter, collectivite: v === '__all__' ? undefined : v, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Collectivité" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{collectivites.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.collectivite && groupements.length > 0 && (
            <Select value={filter.groupement || '__all__'} onValueChange={v => onChange({ ...filter, groupement: v === '__all__' ? undefined : v, villageFilter: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Groupement" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{groupements.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.groupement && villages.length > 0 && (
            <Select value={filter.villageFilter || '__all__'} onValueChange={v => onChange({ ...filter, villageFilter: v === '__all__' ? undefined : v })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Village" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};
