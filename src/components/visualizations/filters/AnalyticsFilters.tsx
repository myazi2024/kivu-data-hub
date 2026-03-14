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

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export const AnalyticsFilters: React.FC<Props> = ({ data, filter, onChange, dateField = 'created_at' }) => {
  const years = useMemo(() => getAvailableYears(data, dateField), [data, dateField]);

  const filteredData = useMemo(() => {
    let d = data;
    if (filter.ville) d = d.filter(r => r.ville === filter.ville);
    if (filter.commune) d = d.filter(r => r.commune === filter.commune);
    if (filter.quartier) d = d.filter(r => r.quartier === filter.quartier);
    if (filter.territoire) d = d.filter(r => r.territoire === filter.territoire);
    if (filter.collectivite) d = d.filter(r => r.collectivite === filter.collectivite);
    if (filter.groupement) d = d.filter(r => r.groupement === filter.groupement);
    return d;
  }, [data, filter]);

  const villes = useMemo(() => extractUnique(data, 'ville'), [data]);
  const communes = useMemo(() => extractUnique(filter.ville ? data.filter(r => r.ville === filter.ville) : data, 'commune'), [data, filter.ville]);
  const quartiers = useMemo(() => extractUnique(filteredData, 'quartier'), [filteredData]);
  const avenues = useMemo(() => extractUnique(filteredData, 'avenue'), [filteredData]);
  const territoires = useMemo(() => extractUnique(data, 'territoire'), [data]);
  const collectivites = useMemo(() => extractUnique(filter.territoire ? data.filter(r => r.territoire === filter.territoire) : data, 'collectivite'), [data, filter.territoire]);
  const groupements = useMemo(() => extractUnique(filteredData, 'groupement'), [filteredData]);
  const villages = useMemo(() => extractUnique(filteredData, 'village'), [filteredData]);

  const hasActiveFilters = filter.periodType !== 'all' || filter.sectionType !== 'all' || filter.ville || filter.territoire;

  const reset = () => onChange({ ...defaultFilter });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1 text-xs"><Filter className="h-3 w-3" /> Filtres</Badge>

        {/* Period */}
        <Select value={filter.periodType} onValueChange={v => onChange({ ...filter, periodType: v as any, year: undefined, subPeriod: undefined })}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]"><Calendar className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="h-7 text-xs w-auto min-w-[80px]"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {filter.periodType === 'semester' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[80px]"><SelectValue placeholder="Semestre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">S1 (Jan-Juin)</SelectItem>
              <SelectItem value="2">S2 (Juil-Déc)</SelectItem>
            </SelectContent>
          </Select>
        )}

        {filter.periodType === 'quarter' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[80px]"><SelectValue placeholder="Trimestre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">T1 (Jan-Mar)</SelectItem>
              <SelectItem value="2">T2 (Avr-Juin)</SelectItem>
              <SelectItem value="3">T3 (Juil-Sep)</SelectItem>
              <SelectItem value="4">T4 (Oct-Déc)</SelectItem>
            </SelectContent>
          </Select>
        )}

        {filter.periodType === 'month' && filter.year && (
          <Select value={String(filter.subPeriod || '')} onValueChange={v => onChange({ ...filter, subPeriod: Number(v) })}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[80px]"><SelectValue placeholder="Mois" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )}

        <div className="w-px h-5 bg-border" />

        {/* Location */}
        <Select value={filter.sectionType} onValueChange={v => onChange({ ...filter, sectionType: v as any, ville: undefined, commune: undefined, quartier: undefined, avenue: undefined, territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]"><MapPin className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sections</SelectItem>
            <SelectItem value="urbaine">Section urbaine</SelectItem>
            <SelectItem value="rurale">Section rurale</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={reset}><X className="h-3 w-3 mr-1" /> Réinitialiser</Button>
        )}
      </div>

      {/* Cascading location filters */}
      {(filter.sectionType === 'urbaine' || filter.sectionType === 'all') && (villes.length > 0 || communes.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap pl-4">
          <span className="text-xs text-muted-foreground">Urbain:</span>
          {villes.length > 0 && (
            <Select value={filter.ville || '__all__'} onValueChange={v => onChange({ ...filter, ville: v === '__all__' ? undefined : v, commune: undefined, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes villes</SelectItem>{villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.ville && communes.length > 0 && (
            <Select value={filter.commune || '__all__'} onValueChange={v => onChange({ ...filter, commune: v === '__all__' ? undefined : v, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Commune" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{communes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.commune && quartiers.length > 0 && (
            <Select value={filter.quartier || '__all__'} onValueChange={v => onChange({ ...filter, quartier: v === '__all__' ? undefined : v, avenue: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Quartier" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{quartiers.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.quartier && avenues.length > 0 && (
            <Select value={filter.avenue || '__all__'} onValueChange={v => onChange({ ...filter, avenue: v === '__all__' ? undefined : v })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Avenue" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{avenues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}

      {(filter.sectionType === 'rurale' || filter.sectionType === 'all') && (territoires.length > 0 || collectivites.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap pl-4">
          <span className="text-xs text-muted-foreground">Rural:</span>
          {territoires.length > 0 && (
            <Select value={filter.territoire || '__all__'} onValueChange={v => onChange({ ...filter, territoire: v === '__all__' ? undefined : v, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Territoire" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{territoires.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.territoire && collectivites.length > 0 && (
            <Select value={filter.collectivite || '__all__'} onValueChange={v => onChange({ ...filter, collectivite: v === '__all__' ? undefined : v, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Collectivité" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{collectivites.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.collectivite && groupements.length > 0 && (
            <Select value={filter.groupement || '__all__'} onValueChange={v => onChange({ ...filter, groupement: v === '__all__' ? undefined : v, villageFilter: undefined })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Groupement" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{groupements.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {filter.groupement && villages.length > 0 && (
            <Select value={filter.villageFilter || '__all__'} onValueChange={v => onChange({ ...filter, villageFilter: v === '__all__' ? undefined : v })}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]"><SelectValue placeholder="Village" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous</SelectItem>{villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};
