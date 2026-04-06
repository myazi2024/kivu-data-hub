import React, { useMemo, useCallback, useContext, createContext } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, X, CheckCircle, CreditCard } from 'lucide-react';
import { AnalyticsFilter, defaultFilter, extractUnique, getAvailableYears, getSectionType } from '@/utils/analyticsHelpers';

/** Context to propagate province filter changes up to the map */
export const ProvinceFilterContext = createContext<((province: string | undefined) => void) | null>(null);

/** Context to receive the currently selected province from the map */
export const MapProvinceContext = createContext<string | null>(null);
import {
  getAllProvinces,
  getVillesForProvince,
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier,
} from '@/lib/geographicData';

interface Props {
  data: any[];
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  dateField?: string;
  statusField?: string;
  paymentStatusField?: string;
  hideStatus?: boolean;
  hidePaymentStatus?: boolean;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export const AnalyticsFilters: React.FC<Props> = ({
  data, filter, onChange, dateField = 'created_at',
  statusField, paymentStatusField, hideStatus = false, hidePaymentStatus = false,
}) => {
  const provinceFilterCallback = useContext(ProvinceFilterContext);
  const years = useMemo(() => {
    const dataYears = getAvailableYears(data, dateField);
    const currentYear = new Date().getFullYear();
    if (!dataYears.includes(currentYear)) dataYears.unshift(currentYear);
    return dataYears.sort((a, b) => b - a);
  }, [data, dateField]);

  // === Geographic hierarchy ===
  const provinces = useMemo(() => getAllProvinces(), []);

  // Scoped data for detecting sections
  const provinceScoped = useMemo(
    () => filter.province ? data.filter(r => r.province === filter.province) : data,
    [data, filter.province]
  );
  const hasUrbanData = useMemo(() => provinceScoped.some(r => getSectionType(r) === 'urbaine'), [provinceScoped]);
  const hasRuralData = useMemo(() => provinceScoped.some(r => getSectionType(r) === 'rurale'), [provinceScoped]);

  // Urban cascade: use first ville from geographicData as implicit lookup key for commune/quartier/avenue
  const villes = useMemo(() => filter.province ? getVillesForProvince(filter.province) : [], [filter.province]);
  const implicitVille = villes.length > 0 ? villes[0] : undefined;

  const communes = useMemo(() => (filter.province && implicitVille) ? getCommunesForVille(filter.province, implicitVille) : [], [filter.province, implicitVille]);
  // Fallback: extract communes from data if geographicData has none
  const communesFinal = useMemo(() => {
    if (communes.length > 0) return communes;
    const scoped = provinceScoped.filter(r => getSectionType(r) === 'urbaine');
    return extractUnique(scoped, 'commune');
  }, [communes, provinceScoped]);

  const quartiers = useMemo(() => (filter.province && implicitVille && filter.commune) ? getQuartiersForCommune(filter.province, implicitVille, filter.commune) : [], [filter.province, implicitVille, filter.commune]);
  const quartiersFinal = useMemo(() => {
    if (quartiers.length > 0) return quartiers;
    if (!filter.commune) return [];
    const scoped = provinceScoped.filter(r => getSectionType(r) === 'urbaine' && r.commune === filter.commune);
    return extractUnique(scoped, 'quartier');
  }, [quartiers, provinceScoped, filter.commune]);

  const avenues = useMemo(() => (filter.province && implicitVille && filter.commune && filter.quartier) ? getAvenuesForQuartier(filter.province, implicitVille, filter.commune, filter.quartier) : [], [filter.province, implicitVille, filter.commune, filter.quartier]);
  const avenuesFinal = useMemo(() => {
    if (avenues.length > 0) return avenues;
    if (!filter.quartier) return [];
    const scoped = provinceScoped.filter(r => getSectionType(r) === 'urbaine' && r.commune === filter.commune && r.quartier === filter.quartier);
    return extractUnique(scoped, 'avenue');
  }, [avenues, provinceScoped, filter.commune, filter.quartier]);

  // Rural cascade from geographicData
  const territoires = useMemo(() => filter.province ? getTerritoiresForProvince(filter.province) : [], [filter.province]);
  const territoiresFinal = useMemo(() => {
    if (territoires.length > 0) return territoires;
    const scoped = provinceScoped.filter(r => getSectionType(r) === 'rurale');
    return extractUnique(scoped, 'territoire');
  }, [territoires, provinceScoped]);

  const collectivites = useMemo(() => (filter.province && filter.territoire) ? getCollectivitesForTerritoire(filter.province, filter.territoire) : [], [filter.province, filter.territoire]);
  const collectivitesFinal = useMemo(() => {
    if (collectivites.length > 0) return collectivites;
    if (!filter.territoire) return [];
    const scoped = provinceScoped.filter(r => getSectionType(r) === 'rurale' && r.territoire === filter.territoire);
    return extractUnique(scoped, 'collectivite');
  }, [collectivites, provinceScoped, filter.territoire]);

  // Groupements & villages: from data
  const sectionScoped = useMemo(() => {
    let scoped = provinceScoped;
    if (filter.sectionType !== 'all') scoped = scoped.filter(r => getSectionType(r) === filter.sectionType);
    if (filter.territoire) scoped = scoped.filter(r => r.territoire === filter.territoire);
    if (filter.collectivite) scoped = scoped.filter(r => r.collectivite === filter.collectivite);
    return scoped;
  }, [provinceScoped, filter.sectionType, filter.territoire, filter.collectivite]);

  const groupements = useMemo(() => filter.collectivite ? extractUnique(sectionScoped, 'groupement') : [], [sectionScoped, filter.collectivite]);
  const groupementScoped = useMemo(() => filter.groupement ? sectionScoped.filter(r => r.groupement === filter.groupement) : sectionScoped, [sectionScoped, filter.groupement]);
  const villages = useMemo(() => filter.groupement ? extractUnique(groupementScoped, 'village') : [], [groupementScoped, filter.groupement]);

  // Status & payment filters
  const detectedStatusField = statusField || (data.length > 0 && data[0]?.current_status !== undefined ? 'current_status' : 'status');
  const statusOptions = useMemo(() => hideStatus ? [] : extractUnique(data, detectedStatusField), [data, detectedStatusField, hideStatus]);

  const detectedPaymentField = paymentStatusField || (data.length > 0 && data[0]?.submission_payment_status !== undefined ? 'submission_payment_status' : 'payment_status');
  const paymentStatusOptions = useMemo(() => hidePaymentStatus ? [] : extractUnique(data, detectedPaymentField), [data, detectedPaymentField, hidePaymentStatus]);

  const hasActiveFilters = (filter.year !== defaultFilter.year) ||
    filter.semester || filter.quarter || filter.month || filter.week ||
    filter.sectionType !== 'all' ||
    filter.province || filter.commune || filter.quartier || filter.avenue ||
    filter.territoire || filter.collectivite || filter.groupement || filter.villageFilter ||
    filter.status || filter.paymentStatus;

  const reset = useCallback(() => onChange({ ...defaultFilter }), [onChange]);

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

  // Show urban/rural sub-filters based on section selection
  const showUrbanSub = filter.sectionType === 'urbaine' || (filter.sectionType === 'all' && hasUrbanData && !hasRuralData);
  const showRuralSub = filter.sectionType === 'rurale' || (filter.sectionType === 'all' && hasRuralData && !hasUrbanData);

  const selectCls = "h-6 text-[10px] w-auto min-w-[70px]";
  const sep = <span className="text-[10px] text-muted-foreground">›</span>;

  return (
    <div className="space-y-1 bg-background/95 backdrop-blur-sm rounded-md p-1.5 border border-border/30 shadow-sm sticky top-0 z-10">
      {/* Row 1: Temps */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0"><Calendar className="h-2.5 w-2.5" /> Temps</Badge>

        <Select value={String(filter.year)} onValueChange={v => onChange({ ...filter, year: Number(v), semester: undefined, quarter: undefined, month: undefined, week: undefined })}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Année" /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>

        {sep}
        <Select value={filter.semester ? String(filter.semester) : '__all__'} onValueChange={v => onChange({ ...filter, semester: v === '__all__' ? undefined : Number(v), quarter: undefined, month: undefined, week: undefined })}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Sem." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous sem.</SelectItem>
            {semesterOptions.map(s => <SelectItem key={s} value={String(s)}>S{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {filter.semester && (
          <>
            {sep}
            <Select value={filter.quarter ? String(filter.quarter) : '__all__'} onValueChange={v => onChange({ ...filter, quarter: v === '__all__' ? undefined : Number(v), month: undefined, week: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Trim." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous trim.</SelectItem>
                {quarterOptions.map(q => <SelectItem key={q} value={String(q)}>T{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {filter.quarter && (
          <>
            {sep}
            <Select value={filter.month ? String(filter.month) : '__all__'} onValueChange={v => onChange({ ...filter, month: v === '__all__' ? undefined : Number(v), week: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Mois" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous mois</SelectItem>
                {monthOptions.map(m => <SelectItem key={m} value={String(m)}>{MONTHS[m - 1]}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {filter.month && (
          <>
            {sep}
            <Select value={filter.week ? String(filter.week) : '__all__'} onValueChange={v => onChange({ ...filter, week: v === '__all__' ? undefined : Number(v) })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Sem." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes sem.</SelectItem>
                {weekOptions.map(w => <SelectItem key={w} value={String(w)}>Sem. {w}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {!hideStatus && statusOptions.length > 0 && (
          <>
            <div className="w-px h-4 bg-border/50" />
            <Select value={filter.status || '__all__'} onValueChange={v => onChange({ ...filter, status: v === '__all__' ? undefined : v })}>
              <SelectTrigger className={selectCls}><CheckCircle className="h-2.5 w-2.5 mr-0.5" /><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous statuts</SelectItem>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {!hidePaymentStatus && paymentStatusOptions.length > 0 && (
          <Select value={filter.paymentStatus || '__all__'} onValueChange={v => onChange({ ...filter, paymentStatus: v === '__all__' ? undefined : v })}>
            <SelectTrigger className={selectCls}><CreditCard className="h-2.5 w-2.5 mr-0.5" /><SelectValue placeholder="Paiement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous paiements</SelectItem>
              {paymentStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 ml-auto" onClick={reset}><X className="h-2.5 w-2.5" /></Button>
        )}
      </div>

      {/* Row 2: Lieu — Pays › Province › Section › cascade */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0"><MapPin className="h-2.5 w-2.5" /> Lieu</Badge>

        {/* Pays — fixed */}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Rép. Dém. du Congo</Badge>

        {/* Province */}
        {sep}
        <Select value={filter.province || '__all__'} onValueChange={v => {
          const newProvince = v === '__all__' ? undefined : v;
          onChange({
            ...filter,
            province: newProvince,
            sectionType: 'all',
            commune: undefined, quartier: undefined, avenue: undefined,
            territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
          });
          provinceFilterCallback?.(newProvince);
        }}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Province" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les provinces</SelectItem>
            {provinces.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Section — always visible after Province */}
        {sep}
        <Select value={filter.sectionType} onValueChange={v => onChange({
          ...filter,
          sectionType: v as any,
          commune: undefined, quartier: undefined, avenue: undefined,
          territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
        })}>
          <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sections</SelectItem>
            <SelectItem value="urbaine">Urbaine</SelectItem>
            <SelectItem value="rurale">Rurale</SelectItem>
          </SelectContent>
        </Select>

        {/* Urban cascade: Commune → Quartier → Avenue */}
        {showUrbanSub && (
          <>
            {sep}
            <Select value={filter.commune || '__all__'} onValueChange={v => onChange({ ...filter, commune: v === '__all__' ? undefined : v, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Commune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les communes</SelectItem>
                {communesFinal.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {filter.commune && quartiersFinal.length > 0 && (
              <>
                {sep}
                <Select value={filter.quartier || '__all__'} onValueChange={v => onChange({ ...filter, quartier: v === '__all__' ? undefined : v, avenue: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Quartier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les quartiers</SelectItem>
                    {quartiersFinal.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            {filter.quartier && avenuesFinal.length > 0 && (
              <>
                {sep}
                <Select value={filter.avenue || '__all__'} onValueChange={v => onChange({ ...filter, avenue: v === '__all__' ? undefined : v })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Avenue" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes les avenues</SelectItem>
                    {avenuesFinal.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </>
        )}

        {/* Rural cascade: Territoire → Collectivité → Groupement → Village */}
        {showRuralSub && (
          <>
            {sep}
            <Select value={filter.territoire || '__all__'} onValueChange={v => onChange({ ...filter, territoire: v === '__all__' ? undefined : v, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Territoire" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les territoires</SelectItem>
                {territoiresFinal.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {filter.territoire && collectivitesFinal.length > 0 && (
              <>
                {sep}
                <Select value={filter.collectivite || '__all__'} onValueChange={v => onChange({ ...filter, collectivite: v === '__all__' ? undefined : v, groupement: undefined, villageFilter: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Collectivité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes les collectivités</SelectItem>
                    {collectivitesFinal.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            {filter.collectivite && groupements.length > 0 && (
              <>
                {sep}
                <Select value={filter.groupement || '__all__'} onValueChange={v => onChange({ ...filter, groupement: v === '__all__' ? undefined : v, villageFilter: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Groupement" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les groupements</SelectItem>
                    {groupements.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            {filter.groupement && villages.length > 0 && (
              <>
                {sep}
                <Select value={filter.villageFilter || '__all__'} onValueChange={v => onChange({ ...filter, villageFilter: v === '__all__' ? undefined : v })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Village" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les villages</SelectItem>
                    {villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
