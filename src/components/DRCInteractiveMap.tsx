import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, DollarSign, BarChart3, Info, FileText, Database, AlertTriangle, Loader2 } from 'lucide-react';
import DRCMapWithTooltip from './DRCMapWithTooltip';

import { ProvinceData } from '@/types/province';
import ProvinceDataVisualization from './visualizations/ProvinceDataVisualization';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

/** Province IDs and names for the 26 provinces */
const PROVINCE_META: { id: string; name: string }[] = [
  { id: 'CDKN', name: 'Kinshasa' },
  { id: 'CDNK', name: 'Nord-Kivu' },
  { id: 'CDSK', name: 'Sud-Kivu' },
  { id: 'CDBC', name: 'Kongo Central' },
  { id: 'CDHK', name: 'Haut-Katanga' },
  { id: 'CDLU', name: 'Lualaba' },
  { id: 'CDKC', name: 'Kasaï-Central' },
  { id: 'CDKS', name: 'Kasaï' },
  { id: 'CDKE', name: 'Kasaï-Oriental' },
  { id: 'CDSA', name: 'Sankuru' },
  { id: 'CDLO', name: 'Lomami' },
  { id: 'CDMA', name: 'Maniema' },
  { id: 'CDTO', name: 'Tshopo' },
  { id: 'CDIT', name: 'Ituri' },
  { id: 'CDHU', name: 'Haut-Uele' },
  { id: 'CDBU', name: 'Bas-Uele' },
  { id: 'CDMO', name: 'Mongala' },
  { id: 'CDSU', name: 'Sud-Ubangi' },
  { id: 'CDNU', name: 'Nord-Ubangi' },
  { id: 'CDTU', name: 'Tshuapa' },
  { id: 'CDMN', name: 'Mai-Ndombe' },
  { id: 'CDKL', name: 'Kwilu' },
  { id: 'CDKG', name: 'Kwango' },
  { id: 'CDTA', name: 'Tanganyika' },
  { id: 'CDHL', name: 'Haut-Lomami' },
  { id: 'CDEQ', name: 'Équateur' },
];

/** Count records matching a province name */
function countForProvince(records: any[], provinceName: string): number {
  return records.filter(r => r.province === provinceName).length;
}

/** Sum a field for records matching a province */
function sumForProvince(records: any[], provinceName: string, field: string): number {
  return records
    .filter(r => r.province === provinceName)
    .reduce((s, r) => s + (r[field] || 0), 0);
}

const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'map' | 'details' | 'analytics'>('map');

  const { data: analytics, isLoading } = useLandDataAnalytics();

  const rdcMapDefaults = ANALYTICS_TABS_REGISTRY['rdc-map']
    ? [...ANALYTICS_TABS_REGISTRY['rdc-map'].kpis, ...ANALYTICS_TABS_REGISTRY['rdc-map'].charts]
    : [];
  const { isChartVisible, getChartConfig } = useTabChartsConfig('rdc-map', rdcMapDefaults);

  /** Build tooltip line configs from admin config */
  const tooltipLineConfigs = useMemo(() => {
    const keys = [
      'tooltip-parcels', 'tooltip-titles', 'tooltip-contributions', 'tooltip-mutations',
      'tooltip-disputes', 'tooltip-expertises', 'tooltip-certificates', 'tooltip-invoices',
      'tooltip-revenue', 'tooltip-fiscal', 'tooltip-density',
    ];
    return keys.map(key => ({
      key,
      visible: isChartVisible(key),
      title: getChartConfig(key)?.custom_title || '',
    }));
  }, [isChartVisible, getChartConfig]);

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  /** Build province data from real Supabase analytics */
  const provincesData: ProvinceData[] = useMemo(() => {
    if (!analytics) return PROVINCE_META.map(p => buildEmptyProvince(p));

    const { parcels, titleRequests, contributions, invoices, disputes, mutationRequests, certificates, expertiseRequests } = analytics;

    return PROVINCE_META.map(meta => {
      const pCount = countForProvince(parcels, meta.name);
      const trCount = countForProvince(titleRequests, meta.name);
      const contribCount = countForProvince(contributions, meta.name);
      const disputeCount = countForProvince(disputes, meta.name);
      const mutationCount = countForProvince(mutationRequests, meta.name);
      const certCount = countForProvince(certificates, meta.name);
      const expertiseCount = countForProvince(expertiseRequests, meta.name);

      const paidInvoices = invoices.filter(i => i.province === meta.name && i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total_amount_usd || 0), 0);
      const allInvoices = invoices.filter(i => i.province === meta.name);
      const totalInvoiceAmount = allInvoices.reduce((s, i) => s + (i.total_amount_usd || 0), 0);

      const taxPaid = analytics.taxHistory.filter(t => t.province === meta.name && t.payment_status === 'paid');
      const fiscalRevenue = taxPaid.reduce((s, t) => s + (t.amount_usd || 0), 0);

      // Surface totale
      const totalSurface = parcels.filter(p => p.province === meta.name).reduce((s, p) => s + (p.area_sqm || 0), 0);

      // Disputes resolved ratio
      const resolvedDisputes = disputes.filter(d => d.province === meta.name && (d.current_status === 'resolved' || d.current_status === 'resolu')).length;

      return {
        id: meta.id,
        name: meta.name,
        parcelsCount: pCount,
        titleRequestsCount: trCount,
        revenueUsd: totalRevenue,
        contributionsCount: contribCount,
        mutationsCount: mutationCount,
        disputesCount: disputeCount,
        densityLevel: (pCount > 500 ? 'Très élevé' : pCount > 100 ? 'Élevé' : pCount > 30 ? 'Modéré' : 'Faible') as ProvinceData['densityLevel'],
        certificatesCount: certCount,
        invoicesCount: allInvoices.length,
        expertisesCount: expertiseCount,
        fiscalRevenueUsd: fiscalRevenue,
        disputeResolutionRate: disputeCount > 0 ? Math.round((resolvedDisputes / disputeCount) * 100) : 0,
        totalSurfaceHa: Math.round(totalSurface / 10000),
      };
    });
  }, [analytics]);

  /** Max parcels across provinces for choropleth */
  const maxParcels = useMemo(() => Math.max(1, ...provincesData.map(p => p.prixMoyenLoyer)), [provincesData]);

  const formatNumber = (value: number): string => new Intl.NumberFormat('fr-FR').format(value);
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  /** Dynamic choropleth color based on parcels count */
  const getProvinceColor = (province: ProvinceData) => {
    const ratio = province.prixMoyenLoyer / maxParcels; // prixMoyenLoyer = parcels count
    const lightness = 85 - ratio * 50; // 85% (light) → 35% (dark)
    return `hsl(142, 71%, ${lightness}%)`;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
        {/* Contrôle mobile: bascule Analytics */}
        <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center justify-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2.5 py-1.5 shadow-lg">
            <Button size="sm" variant={activeMobilePanel !== 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('map')} aria-label="Carte & Données" className="rounded-full h-7 px-3 text-[10px] gap-1">
              <MapPin className="w-3 h-3" />
              Carte
            </Button>
            <Button size="sm" variant={activeMobilePanel === 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('analytics')} aria-label="Analytics" className="rounded-full h-7 px-3 text-[10px] gap-1">
              <BarChart3 className="w-3 h-3" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Desktop: grille 2 colonnes | Mobile: 2 panneaux côte à côte */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-1 sm:gap-2 p-1 sm:p-2 pb-14 lg:pb-2">
          
          {/* Colonne gauche: Carte + Détails province */}
          <div className={`${activeMobilePanel === 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 flex-col min-h-0 h-full gap-1 sm:gap-2`}>
            
            {/* Carte RDC */}
            <div className={`flex flex-col min-h-0 transition-all duration-300 w-full ${selectedProvince ? 'h-1/2 lg:h-auto' : 'h-full lg:h-auto'} lg:flex-[3]`}>
              <Card className="flex-1 overflow-hidden flex flex-col border-border/30">
                <CardContent className="p-0 flex-1 flex flex-col relative min-h-0">
                  <div className="bg-muted/20 px-2 py-0.5 border-b border-border/30 flex-shrink-0">
                    <h2 className="text-[10px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>RDC — Données réelles</span>
                    </h2>
                  </div>
                  
                  <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center p-1">
                    <div className="w-full h-full flex items-center justify-center" style={{ transform: 'scale(0.8)', transformOrigin: 'center center' }}>
                      <DRCMapWithTooltip
                        provincesData={provincesData}
                        selectedProvince={selectedProvince?.id || null}
                        onProvinceSelect={setSelectedProvince}
                        onProvinceHover={setHoveredProvince}
                        hoveredProvince={hoveredProvince}
                        getProvinceColor={getProvinceColor}
                        onMapReady={setMapInstance}
                        tooltipLineConfigs={tooltipLineConfigs}
                      />
                    </div>
                  </div>
                  
                  {/* Légende choroplèthe */}
                  <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-1.5 py-1 border border-border/30">
                    <div className="text-[8px] text-muted-foreground mb-0.5">Densité parcelles</div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-3 h-2 rounded-sm" style={{ background: 'hsl(142, 71%, 85%)' }} />
                      <span className="text-[7px] text-muted-foreground">0</span>
                      <div className="w-8 h-2 rounded-sm" style={{ background: 'linear-gradient(to right, hsl(142, 71%, 85%), hsl(142, 71%, 35%))' }} />
                      <span className="text-[7px] text-muted-foreground">{maxParcels}</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 z-10">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-64 p-2 text-[10px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-blue-700 dark:text-blue-300">Données calculées depuis Supabase</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300">Couleur = densité de parcelles</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Données province — real stats */}
            <div className={`${activeMobilePanel === 'analytics' ? 'hidden lg:block' : selectedProvince ? 'h-1/2' : 'hidden lg:block'} lg:h-auto lg:flex-[2] min-h-0 overflow-hidden transition-all duration-300 w-full`}>
              <Card className="h-full flex flex-col border-border/30 overflow-hidden">
                <ScrollArea className="flex-1">
                  {selectedProvince ? (
                    <div className="p-2 space-y-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{selectedProvince.name}</span>
                        </div>
                        <button
                          onClick={() => setSelectedProvince(null)}
                          className="lg:hidden flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground"
                          aria-label="Fermer"
                        >
                          <span className="text-xs font-medium leading-none">✕</span>
                        </button>
                      </div>
                      
                      {/* Cadastre */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Database className="h-3 w-3 text-primary" />
                          Cadastre
                        </h5>
                        <div className="grid grid-cols-3 gap-1">
                          {isChartVisible('detail-parcels') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-parcels', 'Parcelles')}</div>
                              <div className="text-[11px] font-bold text-primary">{formatNumber(selectedProvince.prixMoyenLoyer)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-titles') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-titles', 'Titres dem.')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatNumber(selectedProvince.prixMoyenVenteM2)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-contributions') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-contributions', 'Contributions')}</div>
                              <div className="text-[11px] font-bold text-emerald-600">{formatNumber(selectedProvince.tauxOccupationLocatif)}</div>
                            </Card>
                          )}
                        </div>
                      </div>

                      {/* Activité */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary" />
                          Activité
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                          {isChartVisible('detail-mutations') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-mutations', 'Mutations')}</div>
                              <div className="text-[11px] font-bold text-violet-600">{formatNumber(selectedProvince.dureeMoyenneMiseLocationJours)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-disputes') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-disputes', 'Litiges')}</div>
                              <div className="text-[11px] font-bold text-orange-500">{formatNumber(selectedProvince.tauxVacanceLocative)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-certificates') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-certificates', 'Certificats')}</div>
                              <div className="text-[11px] font-bold text-emerald-600">{formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-expertises') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-expertises', 'Expertises')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatNumber(selectedProvince.populationLocativeEstimee)}</div>
                            </Card>
                          )}
                        </div>
                      </div>

                      {/* Finances */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-primary" />
                          Finances
                        </h5>
                        <div className="grid grid-cols-3 gap-1">
                          {isChartVisible('detail-revenue') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-revenue', 'Revenus')}</div>
                              <div className="text-[11px] font-bold text-primary">{formatCurrency(selectedProvince.recettesLocativesUsd)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-fiscal') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-fiscal', 'Recettes fisc.')}</div>
                              <div className="text-[11px] font-bold text-emerald-600">{formatCurrency(selectedProvince.recettesFiscalesUsd)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-invoices') && (
                            <Card className="p-1 border-border/30">
                              <div className="text-[9px] text-muted-foreground truncate">{dt('detail-invoices', 'Factures')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</div>
                            </Card>
                          )}
                        </div>
                      </div>

                      {/* Indicateurs */}
                      <div className="grid grid-cols-3 gap-1">
                        {isChartVisible('detail-density') && (
                          <Card className="p-1 border-border/30">
                            <div className="text-[9px] text-muted-foreground truncate">{dt('detail-density', 'Densité')}</div>
                            <Badge 
                              variant={
                                selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                                selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' : 'outline'
                              }
                              className="text-[8px] px-1 py-0"
                            >
                              {selectedProvince.indicePresionLocative}
                            </Badge>
                          </Card>
                        )}
                        {isChartVisible('detail-surface') && (
                          <Card className="p-1 border-border/30">
                            <div className="text-[9px] text-muted-foreground truncate">{dt('detail-surface', 'Surface (ha)')}</div>
                            <div className="text-[11px] font-bold text-accent">{formatNumber(selectedProvince.indicePresionFonciere || 0)}</div>
                          </Card>
                        )}
                        {isChartVisible('detail-resolution') && (
                          <Card className="p-1 border-border/30">
                            <div className="text-[9px] text-muted-foreground truncate">{dt('detail-resolution', 'Résol. litiges')}</div>
                            <div className="text-[11px] font-bold text-emerald-600">{selectedProvince.tauxPropriete || 0}%</div>
                          </Card>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full p-4">
                      <p className="text-[10px] text-muted-foreground text-center">Cliquez sur une province</p>
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </div>

          {/* Colonne droite: Analytics */}
          <div className={`${activeMobilePanel !== 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col min-h-0 h-full`}>
            <Card className="flex-1 flex flex-col overflow-hidden border-border/30 min-h-0">
              <CardHeader className="px-2 py-1 border-b border-border/20 flex-shrink-0">
                <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  <span>Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden charts-compact text-[10px] min-h-0">
                <div className="h-full p-1.5 sm:p-2">
                  <ProvinceDataVisualization 
                    provinces={provincesData} 
                    selectedProvince={selectedProvince}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
};

/** Build an empty province for loading state */
function buildEmptyProvince(meta: { id: string; name: string }): ProvinceData {
  return {
    id: meta.id,
    name: meta.name,
    prixMoyenLoyer: 0,
    prixMoyenVenteM2: 0,
    valeurFonciereParcelleUsd: 0,
    tauxOccupationLocatif: 0,
    dureeMoyenneMiseLocationJours: 0,
    tauxVacanceLocative: 0,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 0,
    nombreTransactionsEstimees: 0,
    populationLocativeEstimee: 0,
    recettesLocativesUsd: 0,
    recettesFiscalesUsd: 0,
    variationLoyer3Mois: 0,
    typologieDominante: '',
  };
}

export default DRCInteractiveMap;
