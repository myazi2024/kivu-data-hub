import React, { useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, MapPin, Calendar, X, CheckCircle, CreditCard } from 'lucide-react';
import { AnalyticsFilter, defaultFilter, extractUnique, getAvailableYears, getSectionType } from '@/utils/analyticsHelpers';
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
  const years = useMemo(() => getAvailableYears(data, dateField), [data, dateField]);

  // === Geographic hierarchy from geographicData (same as forms) ===
  const provinces = useMemo(() => getAllProvinces(), []);

  // After province, detect which sections have data
  const provinceScoped = useMemo(
    () => filter.province ? data.filter(r => r.province === filter.province) : data,
    [data, filter.province]
  );
  const hasUrbanData = useMemo(() => provinceScoped.some(r => getSectionType(r) === 'urbaine'), [provinceScoped]);
  const hasRuralData = useMemo(() => provinceScoped.some(r => getSectionType(r) === 'rurale'), [provinceScoped]);

  // Urban cascade from geographicData
  const villes = useMemo(() => filter.province ? getVillesForProvince(filter.province) : [], [filter.province]);
  const communes = useMemo(() => (filter.province && filter.ville) ? getCommunesForVille(filter.province, filter.ville) : [], [filter.province, filter.ville]);
  const quartiers = useMemo(() => (filter.province && filter.ville && filter.commune) ? getQuartiersForCommune(filter.province, filter.ville, filter.commune) : [], [filter.province, filter.ville, filter.commune]);
  const avenues = useMemo(() => (filter.province && filter.ville && filter.commune && filter.quartier) ? getAvenuesForQuartier(filter.province, filter.ville, filter.commune, filter.quartier) : [], [filter.province, filter.ville, filter.commune, filter.quartier]);

  // Rural cascade from geographicData
  const territoires = useMemo(() => filter.province ? getTerritoiresForProvince(filter.province) : [], [filter.province]);
  const collectivites = useMemo(() => (filter.province && filter.territoire) ? getCollectivitesForTerritoire(filter.province, filter.territoire) : [], [filter.province, filter.territoire]);

  // Groupements & villages: not in geographicData, fall back to data extraction
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

  const hasActiveFilters = filter.periodType !== 'all' || filter.sectionType !== 'all' ||
    filter.province || filter.ville || filter.commune || filter.quartier || filter.avenue ||
    filter.territoire || filter.collectivite || filter.groupement || filter.villageFilter ||
    filter.status || filter.paymentStatus;

  const reset = useCallback(() => onChange({ ...defaultFilter }), [onChange]);

  const showUrbanSub = (filter.sectionType === 'urbaine' || (filter.sectionType === 'all' && !hasRuralData)) && villes.length > 0;
  const showRuralSub = (filter.sectionType === 'rurale' || (filter.sectionType === 'all' && !hasUrbanData)) && territoires.length > 0;

  const selectCls = "h-6 text-[10px] w-auto min-w-[70px]";

  return (
    <div className="space-y-1 bg-background/95 backdrop-blur-sm rounded-md p-1.5 border border-border/30 shadow-sm sticky top-0 z-10">
      {/* Row 1: Temps + Statuts */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0"><Calendar className="h-2.5 w-2.5" /> Temps</Badge>

        <Select value={filter.periodType} onValueChange={v => onChange({ ...filter, periodType: v as any, year: undefined, subPeriod: undefined })}>
          <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
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

        {/* Status & payment inline */}
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

      {/* Row 2: Espace — funnel Province → Section → sub-levels */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0"><MapPin className="h-2.5 w-2.5" /> Lieu</Badge>

        {/* Province */}
        <Select value={filter.province || '__all__'} onValueChange={v => onChange({
          ...filter,
          province: v === '__all__' ? undefined : v,
          sectionType: 'all',
          ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
          territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
        })}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Province" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Rép. Dém. du Congo</SelectItem>
            {provinces.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Section — show when province selected and both sections have data */}
        {filter.province && (hasUrbanData || hasRuralData) && (
          <>
            <span className="text-[10px] text-muted-foreground">›</span>
            <Select value={filter.sectionType} onValueChange={v => onChange({
              ...filter,
              sectionType: v as any,
              ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
              territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
            })}>
              <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sections</SelectItem>
                {hasUrbanData && <SelectItem value="urbaine">Urbaine</SelectItem>}
                {hasRuralData && <SelectItem value="rurale">Rurale</SelectItem>}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Urban cascade */}
        {showUrbanSub && (
          <>
            <span className="text-[10px] text-muted-foreground">›</span>
            <Select value={filter.ville || '__all__'} onValueChange={v => onChange({ ...filter, ville: v === '__all__' ? undefined : v, commune: undefined, quartier: undefined, avenue: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Toutes villes</SelectItem>{villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            {filter.ville && communes.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.commune || '__all__'} onValueChange={v => onChange({ ...filter, commune: v === '__all__' ? undefined : v, quartier: undefined, avenue: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Commune" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{communes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {filter.commune && quartiers.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.quartier || '__all__'} onValueChange={v => onChange({ ...filter, quartier: v === '__all__' ? undefined : v, avenue: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Quartier" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Tous</SelectItem>{quartiers.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {filter.quartier && avenues.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.avenue || '__all__'} onValueChange={v => onChange({ ...filter, avenue: v === '__all__' ? undefined : v })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Avenue" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{avenues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
          </>
        )}

        {/* Rural cascade */}
        {showRuralSub && (
          <>
            <span className="text-[10px] text-muted-foreground">›</span>
            <Select value={filter.territoire || '__all__'} onValueChange={v => onChange({ ...filter, territoire: v === '__all__' ? undefined : v, collectivite: undefined, groupement: undefined, villageFilter: undefined })}>
              <SelectTrigger className={selectCls}><SelectValue placeholder="Territoire" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Tous territoires</SelectItem>{territoires.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            {filter.territoire && collectivites.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.collectivite || '__all__'} onValueChange={v => onChange({ ...filter, collectivite: v === '__all__' ? undefined : v, groupement: undefined, villageFilter: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Collectivité" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Toutes</SelectItem>{collectivites.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {filter.collectivite && groupements.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.groupement || '__all__'} onValueChange={v => onChange({ ...filter, groupement: v === '__all__' ? undefined : v, villageFilter: undefined })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Groupement" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Tous</SelectItem>{groupements.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {filter.groupement && villages.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">›</span>
                <Select value={filter.villageFilter || '__all__'} onValueChange={v => onChange({ ...filter, villageFilter: v === '__all__' ? undefined : v })}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Village" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Tous</SelectItem>{villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
