import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { Coins, Scale, Building2, ShieldCheck, Calendar, TrendingUp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { ScatterCard, ComboBarCard, RankingTableCard } from '../shared/MarketChartCards';
import { BlockUnscopedRecordsProvider } from '../shared/BlockUnscopedRecordsContext';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';
import {
  salePrice, monthlyRent, rentalYield, parcelArea, builtArea, hasBuildingPermit, isBuilt, locationOf,
  mean, median, avgByGroup, priceAndYieldByLocation, marketValueByCategory, countByCategory,
  saleRentByKey, saleRentByClass, scatterPoints, avgByYear, countByClass, topInvestments,
  valuationStatus, permitSplit, AREA_CLASSES, areaClass, HEIGHT_CLASSES, heightClass,
  CAPACITY_CLASSES, capacityClass, AGE_CLASSES, ageClass, CONSTRUCTION_STATUS_LABEL, RES_COM_LABEL,
} from '@/utils/rentalMarketAnalytics';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'rental-market';
const usd = (n: number) => (n ? `${Math.round(n).toLocaleString('fr-FR')} $` : '—');
const kusd = (n: number) => (n ? (n >= 1000 ? `${Math.round(n / 1000).toLocaleString('fr-FR')} k$` : `${Math.round(n)} $`) : '—');
const SALE_RENT = [{ dataKey: 'vente', name: 'Vente moy. ($)', colorIndex: 0 }, { dataKey: 'location', name: 'Loyer moy. ($/mois)', colorIndex: 3 }];
const SALE_ONLY = [{ dataKey: 'vente', name: 'Vente moy. ($)', colorIndex: 0 }];

export const RentalMarketBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filteredUnscoped, filterConfig, v, ct, ty, ord } =
    useBlockFilter(TAB_KEY, data.contributions);

  const m = useMemo(() => {
    const sales = filtered.map(salePrice).filter(Boolean) as number[];
    const rents = filtered.map(monthlyRent).filter(Boolean) as number[];
    const yields = filtered.map(rentalYield).filter(Boolean) as number[];
    const built = filtered.filter(isBuilt);
    return {
      sales, rents, yields, built,
      avgArea: mean(filtered.map(parcelArea).filter(Boolean) as number[]),
      avgBuilt: mean(filtered.map(builtArea).filter(Boolean) as number[]),
      combo: priceAndYieldByLocation(filtered),
      byCategory: saleRentByKey(filtered, r => r.property_category || null),
      valueByCat: marketValueByCategory(filtered),
      shareByCat: countByCategory(filtered),
      resCom: saleRentByKey(filtered, r => RES_COM_LABEL[r.construction_type] || null),
      scAreaSale: scatterPoints(filtered, parcelArea, salePrice),
      scAreaRent: scatterPoints(filtered, parcelArea, monthlyRent),
      scBuiltSale: scatterPoints(filtered, builtArea, salePrice),
      scBuiltRent: scatterPoints(filtered, builtArea, monthlyRent),
      scBuiltCap: scatterPoints(filtered, builtArea, salePrice, r => Number(r.hosting_capacity) || null),
      byAreaClass: saleRentByClass(filtered, AREA_CLASSES, areaClass),
      byHeight: saleRentByClass(filtered, HEIGHT_CLASSES, heightClass),
      byCapacity: saleRentByClass(filtered, CAPACITY_CLASSES, capacityClass),
      saleByYear: avgByYear(filtered, salePrice),
      rentByYear: avgByYear(filtered, monthlyRent),
      byStatus: saleRentByKey(filtered, r => CONSTRUCTION_STATUS_LABEL[r.construction_status] || null),
      byAge: countByClass(filtered, AGE_CLASSES, r => ageClass(r)),
      byPermit: saleRentByKey(built, r => (hasBuildingPermit(r) ? 'Avec autorisation' : 'Sans autorisation')),
      permitSplit: permitSplit(filtered),
      yieldByCat: avgByGroup(filtered, r => r.property_category || '', rentalYield),
      investments: topInvestments(filtered),
      valuation: valuationStatus(filtered),
    };
  }, [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-avg-sale', label: ct('kpi-avg-sale', 'Prix de vente moyen'), value: kusd(mean(m.sales)), cls: 'text-primary', tooltip: `${m.sales.length} bien(s) avec prix déclaré` },
    { key: 'kpi-median-sale', label: ct('kpi-median-sale', 'Prix de vente médian'), value: kusd(median(m.sales)), cls: 'text-blue-600' },
    { key: 'kpi-avg-rent', label: ct('kpi-avg-rent', 'Loyer moyen'), value: usd(mean(m.rents)), cls: 'text-violet-600', tooltip: `Loyer mensuel, ${m.rents.length} bien(s) loué(s)` },
    { key: 'kpi-median-rent', label: ct('kpi-median-rent', 'Loyer médian'), value: usd(median(m.rents)), cls: 'text-fuchsia-600' },
    { key: 'kpi-avg-area', label: ct('kpi-avg-area', 'Surface moy. parcelle'), value: m.avgArea ? `${Math.round(m.avgArea).toLocaleString('fr-FR')} m²` : '—', cls: 'text-cyan-600' },
    { key: 'kpi-avg-built', label: ct('kpi-avg-built', 'Surface moy. bâtie'), value: m.avgBuilt ? `${Math.round(m.avgBuilt).toLocaleString('fr-FR')} m²` : '—', cls: 'text-teal-600' },
    { key: 'kpi-avg-yield', label: ct('kpi-avg-yield', 'Rendement locatif moyen'), value: m.yields.length ? `${mean(m.yields).toFixed(1)} %` : '—', cls: 'text-amber-600', tooltip: 'Loyer annuel / prix de vente' },
  ].filter(k => v(k.key)), [m, v, ct]);

  const chartDefs = useMemo(() => {
    const bar = (key: string, title: string, d: { name: string; value: number }[], type: any, ci: number, what: string, icon?: any) =>
      <ChartCard title={ct(key, title)} icon={icon} data={d} type={ty(key, type)} colorIndex={ci} labelWidth={110} hidden={d.length === 0}
        insight={generateInsight(d, ty(key, type) as any, what)} />;
    const combo = (key: string, title: string, d: any[], bars = SALE_RENT, what = '') =>
      <ComboBarCard title={ct(key, title)} data={d} bars={bars} hidden={d.length === 0}
        insight={what || `${d.length} groupe(s) comparé(s) ; prix de vente à gauche, loyer à droite.`} />;
    const sc = (key: string, title: string, d: any[], x: string, y: string, ci: number, z?: string) =>
      <ScatterCard title={ct(key, title)} data={d} xLabel={x} yLabel={y} zLabel={z} colorIndex={ci} hidden={d.length === 0}
        insight={`${d.length} bien(s) représenté(s).`} />;
    return [
      { key: 'price-yield-location', el: () => <ComboBarCard title={ct('price-yield-location', 'Prix de vente et rendement par localité')} data={m.combo} bars={SALE_ONLY}
          line={{ dataKey: 'rendement', name: 'Rendement (%)', colorIndex: 5 }} hidden={m.combo.length === 0} colSpan={2}
          insight="Barres : prix de vente moyen ; courbe : rendement locatif moyen (%)." /> },
      { key: 'sale-rent-by-category', el: () => combo('sale-rent-by-category', 'Vente vs location par catégorie', m.byCategory) },
      { key: 'value-by-category', el: () => bar('value-by-category', 'Valeur du marché par catégorie', m.valueByCat, 'donut', 1, 'la valeur déclarée du marché par catégorie', Coins) },
      { key: 'share-by-category', el: () => bar('share-by-category', 'Part de marché par catégorie', m.shareByCat, 'pie', 2, 'la part de chaque catégorie de construction', Building2) },
      { key: 'sale-rent-by-type', el: () => combo('sale-rent-by-type', 'Vente vs location : résidentiel / commercial', m.resCom) },
      { key: 'area-x-sale', el: () => sc('area-x-sale', 'Surface parcelle × prix de vente', m.scAreaSale, 'Surface (m²)', 'Prix ($)', 0) },
      { key: 'area-x-rent', el: () => sc('area-x-rent', 'Surface parcelle × loyer', m.scAreaRent, 'Surface (m²)', 'Loyer ($/mois)', 3) },
      { key: 'built-x-sale', el: () => sc('built-x-sale', 'Surface bâtie × prix de vente', m.scBuiltSale, 'Surface bâtie (m²)', 'Prix ($)', 1) },
      { key: 'built-x-rent', el: () => sc('built-x-rent', 'Surface bâtie × loyer', m.scBuiltRent, 'Surface bâtie (m²)', 'Loyer ($/mois)', 4) },
      { key: 'value-by-area-class', el: () => combo('value-by-area-class', 'Valeur selon la superficie', m.byAreaClass) },
      { key: 'price-by-height', el: () => combo('price-by-height', 'Prix selon la hauteur de construction', m.byHeight) },
      { key: 'price-by-capacity', el: () => combo('price-by-capacity', "Prix selon la capacité d'accueil", m.byCapacity) },
      { key: 'built-capacity-price', el: () => sc('built-capacity-price', "Surface bâtie × capacité d'accueil × prix", m.scBuiltCap, 'Surface bâtie (m²)', 'Prix ($)', 6, 'capacité') },
      { key: 'sale-by-year', el: () => bar('sale-by-year', 'Prix moyen selon l\'année de construction', m.saleByYear, 'area', 0, 'les prix de vente selon l\'année de construction', Calendar) },
      { key: 'rent-by-year', el: () => bar('rent-by-year', 'Loyer moyen selon l\'année de construction', m.rentByYear, 'area', 3, 'les loyers selon l\'année de construction', Calendar) },
      { key: 'sale-rent-by-status', el: () => combo('sale-rent-by-status', 'Vente vs location : achevée / en cours', m.byStatus) },
      { key: 'age-distribution', el: () => bar('age-distribution', 'Biens par tranche d\'âge', m.byAge, 'bar-v', 7, 'l\'âge des constructions', Calendar) },
      { key: 'value-by-permit', el: () => combo('value-by-permit', 'Valeur avec / sans autorisation de bâtir', m.byPermit) },
      { key: 'permit-split', el: () => bar('permit-split', 'Constructions avec / sans autorisation', m.permitSplit, 'donut', 8, 'les autorisations de bâtir', ShieldCheck) },
      { key: 'yield-by-category', el: () => bar('yield-by-category', 'Rendement locatif moyen par catégorie (%)', m.yieldByCat, 'bar-h', 5, 'le rendement locatif par catégorie (%)', TrendingUp) },
      { key: 'top-investments', el: () => <RankingTableCard title={ct('top-investments', 'Top 10 investissements les plus rentables')} rows={m.investments} hidden={m.investments.length === 0} colSpan={2}
          columns={[
            { key: 'localisation', label: 'Localisation' }, { key: 'categorie', label: 'Catégorie' },
            { key: 'prix', label: 'Prix moy.', align: 'right', format: usd }, { key: 'loyer', label: 'Loyer moy.', align: 'right', format: usd },
            { key: 'rendement', label: 'Rendement', align: 'right', format: (n: number) => `${n} %` },
          ]} insight="Moyennes par localité et catégorie ; rendement = loyer annuel / prix de vente." /> },
      { key: 'valuation', el: () => bar('valuation', 'Biens surévalués / sous-évalués', m.valuation, 'donut', 9, 'le prix au m² comparé à la médiane locale de la même catégorie (±30 %, au moins 3 biens)', Scale) },
    ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key));
  }, [m, v, ct, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <BlockUnscopedRecordsProvider records={filteredUnscoped}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </BlockUnscopedRecordsProvider>
    </FilterLabelContext.Provider>
  );
});
