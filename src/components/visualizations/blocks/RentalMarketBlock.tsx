import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Home, Coins, TrendingUp, Tag, Building2, Calendar, Megaphone, Scale, MapPin, ArrowUpFromLine } from 'lucide-react';
import { pct } from '@/utils/analyticsConstants';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { trendByMonth, averageBy, recordBuildingHeightM } from '@/utils/analyticsHelpers';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'rental-market';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v.units)) return v.units;
  if (typeof v === 'object') return [v];
  return [];
};

/** Bucket a numeric value into labelled ranges */
function bucketize(values: number[], buckets: { name: string; min: number; max: number }[]) {
  const counts = new Array(buckets.length).fill(0);
  values.forEach(v => {
    for (let i = 0; i < buckets.length; i++) {
      if (v >= buckets[i].min && v < buckets[i].max) { counts[i]++; break; }
    }
  });
  return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
}

const RENT_BUCKETS = [
  { name: '< 100 $', min: 0, max: 100 },
  { name: '100–299 $', min: 100, max: 300 },
  { name: '300–599 $', min: 300, max: 600 },
  { name: '600–999 $', min: 600, max: 1000 },
  { name: '1 000–2 499 $', min: 1000, max: 2500 },
  { name: '≥ 2 500 $', min: 2500, max: Infinity },
];

const PRICE_BUCKETS = [
  { name: '< 25 k$', min: 0, max: 25000 },
  { name: '25–49 k$', min: 25000, max: 50000 },
  { name: '50–99 k$', min: 50000, max: 100000 },
  { name: '100–249 k$', min: 100000, max: 250000 },
  { name: '250–499 k$', min: 250000, max: 500000 },
  { name: '≥ 500 k$', min: 500000, max: Infinity },
];

export const RentalMarketBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, cx, ty, ord } =
    useBlockFilter(TAB_KEY, data.contributions);

  const rented = useMemo(() => filtered.filter((r: any) => r.is_rented === true), [filtered]);
  const notRented = useMemo(() => filtered.filter((r: any) => r.is_rented === false), [filtered]);

  /** Monthly rents in USD: global value for single-unit, per-unit values for multi-unit */
  const rentValues = useMemo(() => {
    const out: number[] = [];
    filtered.forEach((r: any) => {
      if (r.is_rented !== true) return;
      const units = toArray(r.rental_units);
      if (units.length > 0) {
        units.forEach((u: any) => {
          const amount = Number(u?.monthly_rent_usd ?? u?.rent_usd ?? u?.monthly_rent ?? 0);
          if (amount > 0) out.push(amount);
        });
        return;
      }
      const amount = Number(r.monthly_rent_usd || 0);
      if (amount > 0) out.push(amount);
    });
    return out;
  }, [filtered]);

  const avgRent = useMemo(
    () => (rentValues.length ? rentValues.reduce((s, n) => s + n, 0) / rentValues.length : 0),
    [rentValues],
  );

  const rentalStatusData = useMemo(() => ([
    ...(rented.length ? [{ name: 'En location', value: rented.length }] : []),
    ...(notRented.length ? [{ name: 'Pas en location', value: notRented.length }] : []),
  ]), [rented, notRented]);

  const rentalModeData = useMemo(() => {
    const map = new Map<string, number>();
    rented.forEach((r: any) => {
      const mode = r.rental_configuration === 'multi'
        ? 'Divisé en plusieurs locaux'
        : r.rental_configuration === 'single'
          ? 'Un seul local'
          : 'Non précisé';
      map.set(mode, (map.get(mode) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rented]);

  const rentDistribution = useMemo(() => bucketize(rentValues, RENT_BUCKETS), [rentValues]);

  /** Total monthly rent declared for one record (global amount or sum of units) */
  const recordRentUsd = (r: any): number | null => {
    if (r?.is_rented !== true) return null;
    const units = toArray(r.rental_units);
    if (units.length > 0) {
      const sum = units.reduce((acc: number, u: any) => {
        const amount = Number(u?.monthly_rent_usd ?? u?.rent_usd ?? u?.monthly_rent ?? 0);
        return acc + (amount > 0 ? amount : 0);
      }, 0);
      return sum > 0 ? sum : null;
    }
    const amount = Number(r.monthly_rent_usd || 0);
    return amount > 0 ? amount : null;
  };

  const avgRentByCommune = useMemo(() => averageBy(rented, 'commune', recordRentUsd), [rented]);
  const avgRentByQuartier = useMemo(() => averageBy(rented, 'quartier', recordRentUsd), [rented]);
  const avgHeightByCommune = useMemo(() => averageBy(filtered, 'commune', recordBuildingHeightM), [filtered]);
  const avgHeightByQuartier = useMemo(() => averageBy(filtered, 'quartier', recordBuildingHeightM), [filtered]);

  const coverage = (rows: { count: number }[]) =>
    `${rows.reduce((s, r) => s + r.count, 0)} bien(s) pris en compte.`;

  const rentByCategory = useMemo(() => {
    const sums = new Map<string, { total: number; n: number }>();
    filtered.forEach((r: any) => {
      if (r.is_rented !== true) return;
      const cat = r.property_category || 'Non précisé';
      const units = toArray(r.rental_units);
      const amounts = units.length
        ? units.map((u: any) => Number(u?.monthly_rent_usd ?? u?.rent_usd ?? 0)).filter((n: number) => n > 0)
        : [Number(r.monthly_rent_usd || 0)].filter(n => n > 0);
      amounts.forEach(a => {
        const cur = sums.get(cat) || { total: 0, n: 0 };
        sums.set(cat, { total: cur.total + a, n: cur.n + 1 });
      });
    });
    return Array.from(sums.entries())
      .map(([name, s]) => ({ name, value: Math.round(s.total / s.n) }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const rentalSeniority = useMemo(() => {
    const buckets = [
      { name: '< 1 an', min: 0, max: 1 },
      { name: '1-3 ans', min: 1, max: 3 },
      { name: '3-5 ans', min: 3, max: 5 },
      { name: '5-10 ans', min: 5, max: 10 },
      { name: '> 10 ans', min: 10, max: Infinity },
    ];
    const now = Date.now();
    const years: number[] = [];
    filtered.forEach((r: any) => {
      if (!r.rental_start_date) return;
      const t = new Date(r.rental_start_date).getTime();
      if (isNaN(t)) return;
      const y = (now - t) / (1000 * 60 * 60 * 24 * 365.25);
      if (y >= 0) years.push(y);
    });
    return bucketize(years, buckets);
  }, [filtered]);

  const unitsCount = useMemo(
    () => filtered.reduce((s: number, r: any) => s + (toArray(r.rental_units).length || (r.rental_units_count || 0)), 0),
    [filtered],
  );

  const wouldSell = useMemo(() => filtered.filter((r: any) => r.would_sell_if_offered === true), [filtered]);

  const sellIntentData = useMemo(() => {
    const yes = wouldSell.length;
    const no = filtered.filter((r: any) => r.would_sell_if_offered === false).length;
    return [
      ...(yes ? [{ name: 'Disposé à vendre', value: yes }] : []),
      ...(no ? [{ name: 'Non vendeur', value: no }] : []),
    ];
  }, [filtered, wouldSell]);

  const resaleValues = useMemo(
    () => filtered.map((r: any) => Number(r.resale_price_usd || 0)).filter((n: number) => n > 0),
    [filtered],
  );
  const avgResale = useMemo(
    () => (resaleValues.length ? resaleValues.reduce((s, n) => s + n, 0) / resaleValues.length : 0),
    [resaleValues],
  );
  const resaleDistribution = useMemo(() => bucketize(resaleValues, PRICE_BUCKETS), [resaleValues]);

  const currencyData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r: any) => {
      if (!r.resale_price_currency) return;
      const c = String(r.resale_price_currency).toUpperCase();
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const appraised = useMemo(() => filtered.filter((r: any) => r.has_recent_appraisal === true), [filtered]);
  const appraisalData = useMemo(() => {
    const no = filtered.filter((r: any) => r.has_recent_appraisal === false).length;
    return [
      ...(appraised.length ? [{ name: 'Expertise récente', value: appraised.length }] : []),
      ...(no ? [{ name: 'Aucune expertise', value: no }] : []),
    ];
  }, [filtered, appraised]);

  const appraisedDistribution = useMemo(
    () => bucketize(filtered.map((r: any) => Number(r.appraised_value_usd || 0)).filter((n: number) => n > 0), PRICE_BUCKETS),
    [filtered],
  );

  const listingsData = useMemo(() => {
    const rentalAds = filtered.reduce((s: number, r: any) => s + toArray(r.market_listings).length, 0);
    const saleAds = filtered.filter((r: any) => toArray(r.sale_listing).length > 0).length;
    return [
      ...(rentalAds ? [{ name: 'Annonces locatives', value: rentalAds }] : []),
      ...(saleAds ? [{ name: 'Annonces de vente', value: saleAds }] : []),
    ];
  }, [filtered]);

  const trend = useMemo(
    () => trendByMonth(filtered.filter((r: any) => r.is_rented === true || r.would_sell_if_offered === true)),
    [filtered],
  );

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Biens analysés'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-rented', label: ct('kpi-rented', 'En location'), value: rented.length, cls: 'text-emerald-600', tooltip: pct(rented.length, filtered.length) },
    { key: 'kpi-rental-rate', label: ct('kpi-rental-rate', 'Taux de mise en location'), value: pct(rented.length, filtered.length), cls: 'text-blue-600' },
    { key: 'kpi-avg-rent', label: ct('kpi-avg-rent', 'Loyer moyen'), value: avgRent ? `${Math.round(avgRent)} $` : '—', cls: 'text-violet-600', tooltip: 'Loyer mensuel moyen déclaré (USD)' },
    { key: 'kpi-units', label: ct('kpi-units', 'Locaux déclarés'), value: unitsCount, cls: 'text-cyan-600' },
    { key: 'kpi-sellers', label: ct('kpi-sellers', 'Disposés à vendre'), value: wouldSell.length, cls: 'text-amber-600', tooltip: pct(wouldSell.length, filtered.length) },
    { key: 'kpi-avg-resale', label: ct('kpi-avg-resale', 'Prix de revente moyen'), value: avgResale ? `${Math.round(avgResale / 1000)} k$` : '—', cls: 'text-rose-600' },
    { key: 'kpi-appraised', label: ct('kpi-appraised', 'Expertises récentes'), value: appraised.length, cls: 'text-teal-600', tooltip: pct(appraised.length, filtered.length) },
  ].filter(k => v(k.key)), [filtered, rented, avgRent, unitsCount, wouldSell, avgResale, appraised, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'rental-status', el: () => <ChartCard title={ct('rental-status', 'Mise en location')} icon={Home} data={rentalStatusData} type={ty('rental-status', 'pie')} colorIndex={2} hidden={rentalStatusData.length === 0}
      insight={rented.length > 0 ? `${pct(rented.length, filtered.length)} des biens déclarés sont mis en location.` : 'Aucun bien en location déclaré.'} crossVariables={cx('rental-status')} rawRecords={filtered} groupField="is_rented" /> },
    { key: 'rental-mode', el: () => <ChartCard title={ct('rental-mode', 'Mode locatif')} icon={Building2} data={rentalModeData} type={ty('rental-mode', 'donut')} colorIndex={3} hidden={rentalModeData.length === 0}
      insight={generateInsight(rentalModeData, 'donut', 'les modes de mise en location')} crossVariables={cx('rental-mode')} rawRecords={rented} groupField="rental_configuration" /> },
    { key: 'rent-distribution', el: () => <ChartCard title={ct('rent-distribution', 'Tranches de loyer mensuel')} icon={Coins} data={rentDistribution} type={ty('rent-distribution', 'bar-v')} colorIndex={4} hidden={rentDistribution.length === 0}
      insight={generateInsight(rentDistribution, 'bar-v', 'les niveaux de loyer')} /> },
    { key: 'rent-by-category', el: () => <ChartCard title={ct('rent-by-category', 'Loyer moyen par catégorie')} icon={Scale} data={rentByCategory} type={ty('rent-by-category', 'bar-h')} colorIndex={5} hidden={rentByCategory.length === 0}
      insight={generateInsight(rentByCategory, 'bar-h', 'les loyers moyens par catégorie de bien')} /> },
    { key: 'rental-seniority', el: () => <ChartCard title={ct('rental-seniority', 'Ancienneté de mise en location')} icon={Calendar} data={rentalSeniority} type={ty('rental-seniority', 'bar-v')} colorIndex={6} hidden={rentalSeniority.length === 0}
      insight={generateInsight(rentalSeniority, 'bar-v', "l'ancienneté des mises en location")} /> },
    { key: 'sell-intent', el: () => <ChartCard title={ct('sell-intent', 'Disposition à vendre')} icon={Tag} data={sellIntentData} type={ty('sell-intent', 'pie')} colorIndex={7} hidden={sellIntentData.length === 0}
      insight={generateInsight(sellIntentData, 'pie', 'la disposition à vendre')} crossVariables={cx('sell-intent')} rawRecords={filtered} groupField="would_sell_if_offered" /> },
    { key: 'resale-distribution', el: () => <ChartCard title={ct('resale-distribution', 'Tranches de prix de revente')} icon={Coins} data={resaleDistribution} type={ty('resale-distribution', 'bar-v')} colorIndex={8} hidden={resaleDistribution.length === 0}
      insight={generateInsight(resaleDistribution, 'bar-v', 'les prix de revente souhaités')} /> },
    { key: 'currency', el: () => <ChartCard title={ct('currency', 'Devise déclarée')} data={currencyData} type={ty('currency', 'donut')} colorIndex={1} hidden={currencyData.length === 0}
      insight={generateInsight(currencyData, 'donut', 'les devises de valorisation')} crossVariables={cx('currency')} rawRecords={filtered} groupField="resale_price_currency" /> },
    { key: 'appraisal', el: () => <ChartCard title={ct('appraisal', 'Expertise récente')} data={appraisalData} type={ty('appraisal', 'pie')} colorIndex={9} hidden={appraisalData.length === 0}
      insight={generateInsight(appraisalData, 'pie', 'les expertises immobilières récentes')} crossVariables={cx('appraisal')} rawRecords={filtered} groupField="has_recent_appraisal" /> },
    { key: 'appraised-value', el: () => <ChartCard title={ct('appraised-value', 'Tranches de valeur expertisée')} data={appraisedDistribution} type={ty('appraised-value', 'bar-v')} colorIndex={10} hidden={appraisedDistribution.length === 0}
      insight={generateInsight(appraisedDistribution, 'bar-v', 'les valeurs expertisées')} /> },
    { key: 'listings', el: () => <ChartCard title={ct('listings', 'Annonces publiées')} icon={Megaphone} data={listingsData} type={ty('listings', 'bar-h')} colorIndex={11} hidden={listingsData.length === 0}
      insight={generateInsight(listingsData, 'bar-h', 'les annonces publiées')} /> },
    { key: 'rent-by-commune', el: () => <ChartCard title={ct('rent-by-commune', 'Loyer moyen par commune')} icon={MapPin} data={avgRentByCommune} type={ty('rent-by-commune', 'bar-h')} colorIndex={4} labelWidth={110} hidden={avgRentByCommune.length === 0}
      insight={`${generateInsight(avgRentByCommune, 'bar-h', 'le loyer mensuel moyen par commune (USD)')} ${coverage(avgRentByCommune)}`} /> },
    { key: 'rent-by-quartier', el: () => <ChartCard title={ct('rent-by-quartier', 'Loyer moyen par quartier')} icon={MapPin} data={avgRentByQuartier} type={ty('rent-by-quartier', 'bar-h')} colorIndex={5} labelWidth={110} hidden={avgRentByQuartier.length === 0}
      insight={`${generateInsight(avgRentByQuartier, 'bar-h', 'le loyer mensuel moyen par quartier (USD)')} ${coverage(avgRentByQuartier)}`} /> },
    { key: 'height-by-commune', el: () => <ChartCard title={ct('height-by-commune', 'Hauteur moyenne par commune')} icon={ArrowUpFromLine} data={avgHeightByCommune} type={ty('height-by-commune', 'bar-h')} colorIndex={6} labelWidth={110} hidden={avgHeightByCommune.length === 0}
      insight={`${generateInsight(avgHeightByCommune, 'bar-h', 'la hauteur moyenne des constructions par commune (m)')} ${coverage(avgHeightByCommune)}`} /> },
    { key: 'height-by-quartier', el: () => <ChartCard title={ct('height-by-quartier', 'Hauteur moyenne par quartier')} icon={ArrowUpFromLine} data={avgHeightByQuartier} type={ty('height-by-quartier', 'bar-h')} colorIndex={7} labelWidth={110} hidden={avgHeightByQuartier.length === 0}
      insight={`${generateInsight(avgHeightByQuartier, 'bar-h', 'la hauteur moyenne des constructions par quartier (m)')} ${coverage(avgHeightByQuartier)}`} /> },
    { key: 'geo', el: () => <GeoCharts records={rented} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution des déclarations marchandes')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2} hidden={trend.length === 0}
      insight={generateInsight(trend, 'area', 'les déclarations locatives et de vente')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)),
  [filtered, rented, rentalStatusData, rentalModeData, rentDistribution, rentByCategory, rentalSeniority, sellIntentData, resaleDistribution, currencyData, appraisalData, appraisedDistribution, listingsData, avgRentByCommune, avgRentByQuartier, avgHeightByCommune, avgHeightByQuartier, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <BlockUnscopedRecordsProvider records={filteredUnscoped}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});
