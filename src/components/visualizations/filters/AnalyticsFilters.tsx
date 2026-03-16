import React, { useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, MapPin, Calendar, X, Download, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { AnalyticsFilter, defaultFilter, extractUnique, getAvailableYears, getSectionType } from '@/utils/analyticsHelpers';

interface Props {
  data: any[];
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  dateField?: string;
  onExport?: () => void;
  /** Field name for status filter (default: auto-detect 'status' or 'current_status') */
  statusField?: string;
  /** Field name for payment status filter */
  paymentStatusField?: string;
  /** Hide status filter */
  hideStatus?: boolean;
  /** Hide payment status filter */
  hidePaymentStatus?: boolean;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export const AnalyticsFilters: React.FC<Props> = ({
  data, filter, onChange, dateField = 'created_at', onExport,
  statusField, paymentStatusField, hideStatus = false, hidePaymentStatus = false,
}) => {
  const years = useMemo(() => getAvailableYears(data, dateField), [data, dateField]);

  // #8 fix: Detect conflicting urban+rural filters and warn
  const hasConflictingFilters = useMemo(() => {
    if (filter.sectionType !== 'all') return false;
    const hasUrban = !!(filter.ville || filter.commune || filter.quartier || filter.avenue);
    const hasRural = !!(filter.territoire || filter.collectivite || filter.groupement || filter.villageFilter);
    return hasUrban && hasRural;
  }, [filter]);

  // Base dataset scoped by sectionType for dropdown options
  const sectionScoped = useMemo(() => {
    if (filter.sectionType === 'all') return data;
    return data.filter(r => getSectionType(r) === filter.sectionType);
  }, [data, filter.sectionType]);

  const provinces = useMemo(() => extractUnique(sectionScoped, 'province'), [sectionScoped]);
  const provinceScoped = useMemo(() => filter.province ? sectionScoped.filter(r => r.province === filter.province) : sectionScoped, [sectionScoped, filter.province]);
  const villes = useMemo(() => extractUnique(provinceScoped, 'ville'), [provinceScoped]);
  const villeScoped = useMemo(() => filter.ville ? provinceScoped.filter(r => r.ville === filter.ville) : provinceScoped, [provinceScoped, filter.ville]);
  const communes = useMemo(() => extractUnique(villeScoped, 'commune'), [villeScoped]);
  const communeScoped = useMemo(() => filter.commune ? villeScoped.filter(r => r.commune === filter.commune) : villeScoped, [villeScoped, filter.commune]);
  const quartiers = useMemo(() => extractUnique(communeScoped, 'quartier'), [communeScoped]);
  const quartierScoped = useMemo(() => filter.quartier ? communeScoped.filter(r => r.quartier === filter.quartier) : communeScoped, [communeScoped, filter.quartier]);
  const avenues = useMemo(() => extractUnique(quartierScoped, 'avenue'), [quartierScoped]);

  const territoires = useMemo(() => extractUnique(provinceScoped, 'territoire'), [provinceScoped]);
  const territoireScoped = useMemo(() => filter.territoire ? provinceScoped.filter(r => r.territoire === filter.territoire) : provinceScoped, [provinceScoped, filter.territoire]);
  const collectivites = useMemo(() => extractUnique(territoireScoped, 'collectivite'), [territoireScoped]);
  const collectiviteScoped = useMemo(() => filter.collectivite ? territoireScoped.filter(r => r.collectivite === filter.collectivite) : territoireScoped, [territoireScoped, filter.collectivite]);
  const groupements = useMemo(() => extractUnique(collectiviteScoped, 'groupement'), [collectiviteScoped]);
  const groupementScoped = useMemo(() => filter.groupement ? collectiviteScoped.filter(r => r.groupement === filter.groupement) : collectiviteScoped, [collectiviteScoped, filter.groupement]);
  const villages = useMemo(() => extractUnique(groupementScoped, 'village'), [groupementScoped]);

  // Status options (auto-detect field)
  const detectedStatusField = statusField || (data.length > 0 && data[0]?.current_status !== undefined ? 'current_status' : 'status');
  const statusOptions = useMemo(() => {
    if (hideStatus) return [];
    return extractUnique(data, detectedStatusField);
  }, [data, detectedStatusField, hideStatus]);

  // Payment status options
  const detectedPaymentField = paymentStatusField || (data.length > 0 && data[0]?.submission_payment_status !== undefined ? 'submission_payment_status' : 'payment_status');
  const paymentStatusOptions = useMemo(() => {
    if (hidePaymentStatus) return [];
    return extractUnique(data, detectedPaymentField);
  }, [data, detectedPaymentField, hidePaymentStatus]);

  const hasActiveFilters = filter.periodType !== 'all' || filter.sectionType !== 'all' ||
    filter.province || filter.ville || filter.commune || filter.quartier || filter.avenue ||
    filter.territoire || filter.collectivite || filter.groupement || filter.villageFilter ||
    filter.status || filter.paymentStatus;

  const reset = useCallback(() => onChange({ ...defaultFilter }), [onChange]);

  const selectCls = "h-6 text-[10px] w-auto min-w-[70px]";

  return (
    <div className="space-y-1 bg-muted/30 rounded-md p-1.5 border border-border/30">
      {/* #8: Warning for conflicting filters */}
      {hasConflictingFilters && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-0.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Filtres urbains et ruraux actifs simultanément — les résultats peuvent être vides. Sélectionnez une section.</span>
        </div>
      )}

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

        {/* Status filter */}
        {!hideStatus && statusOptions.length > 0 && (
          <Select value={filter.status || '__all__'} onValueChange={v => onChange({ ...filter, status: v === '__all__' ? undefined : v })}>
            <SelectTrigger className={selectCls}><CheckCircle className="h-2.5 w-2.5 mr-0.5" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous statuts</SelectItem>
              {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Payment status filter */}
        {!hidePaymentStatus && paymentStatusOptions.length > 0 && (
          <Select value={filter.paymentStatus || '__all__'} onValueChange={v => onChange({ ...filter, paymentStatus: v === '__all__' ? undefined : v })}>
            <SelectTrigger className={selectCls}><CreditCard className="h-2.5 w-2.5 mr-0.5" /><SelectValue placeholder="Paiement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous paiements</SelectItem>
              {paymentStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="w-px h-4 bg-border/50" />

        {/* #8 fix: When switching sectionType, clear conflicting location filters */}
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

        {onExport && (
          <Button variant="outline" size="sm" className="h-5 text-[10px] px-1.5 ml-auto gap-0.5" onClick={onExport}>
            <Download className="h-2.5 w-2.5" /> CSV
          </Button>
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
