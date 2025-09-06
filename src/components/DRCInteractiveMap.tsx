import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, MapPin, Users, DollarSign, Building, Clock, BarChart3, ZoomIn, ZoomOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import DRCMapWithTooltip from './DRCMapWithTooltip';
import { ProvinceAnalytics } from './charts/ProvinceAnalytics';
import TerritorialMap from './TerritorialMap';
import { useMapEvents } from 'react-leaflet';
import { ProvinceData } from '@/types/province';
import ProvinceDataVisualization from './visualizations/ProvinceDataVisualization';

// Composant carte interactive RDC - simplifié
const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [activeView, setActiveView] = useState<string>('provinces');
  const [activeMobilePanel, setActiveMobilePanel] = useState<'map' | 'details' | 'analytics'>('map');

  // Complete data for all 26 provinces of DRC with correct SVG IDs
  const provincesData: ProvinceData[] = [
    // Kinshasa - Capitale économique
    {
      id: 'CDKN',
      name: 'Kinshasa',
      prixMoyenLoyer: 380,
      prixMoyenVenteM2: 820,
      valeurFonciereParcelleUsd: 15000,
      tauxOccupationLocatif: 80.2,
      dureeMoyenneMiseLocationJours: 25,
      tauxVacanceLocative: 19.8,
      indicePresionLocative: 'Très élevé',
      volumeAnnoncesImmobilieres: 8500,
      nombreTransactionsEstimees: 5200,
      populationLocativeEstimee: 450000,
      recettesLocativesUsd: 850000,
      recettesFiscalesUsd: 125000,
      variationLoyer3Mois: 3.2,
      typologieDominante: 'Appartements',
      rendementLocatifBrut: 5.58,
      tauxCroissancePrixAnnuel: 4.2,
      permisConstruireMois: 120,
      tauxAccessibiliteLogement: 35.2,
      repartitionTypologique: { residential: 65, commercial: 25, mixte: 10 },
      tauxPropriete: 42.5,
      indicePresionFonciere: 2.8,
      region: 'Ouest',
      zone: 'Urbaine'
    },
    // Nord-Kivu - Centre économique de l'Est
    {
      id: 'CDNK',
      name: 'Nord-Kivu',
      prixMoyenLoyer: 195,
      prixMoyenVenteM2: 450,
      valeurFonciereParcelleUsd: 7500,
      tauxOccupationLocatif: 73.5,
      dureeMoyenneMiseLocationJours: 32,
      tauxVacanceLocative: 26.5,
      indicePresionLocative: 'Élevé',
      volumeAnnoncesImmobilieres: 3200,
      nombreTransactionsEstimees: 2100,
      populationLocativeEstimee: 180000,
      recettesLocativesUsd: 425000,
      recettesFiscalesUsd: 68000,
      variationLoyer3Mois: 2.1,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 5.2,
      tauxCroissancePrixAnnuel: 3.8,
      permisConstruireMois: 45,
      tauxAccessibiliteLogement: 48.6,
      repartitionTypologique: { residential: 78, commercial: 15, mixte: 7 },
      tauxPropriete: 58.3,
      indicePresionFonciere: 2.1,
      region: 'Est',
      zone: 'Urbaine'
    },
    // Sud-Kivu
    {
      id: 'CDSK',
      name: 'Sud-Kivu',
      prixMoyenLoyer: 175,
      prixMoyenVenteM2: 395,
      valeurFonciereParcelleUsd: 6800,
      tauxOccupationLocatif: 71.8,
      dureeMoyenneMiseLocationJours: 35,
      tauxVacanceLocative: 28.2,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2800,
      nombreTransactionsEstimees: 1850,
      populationLocativeEstimee: 160000,
      recettesLocativesUsd: 385000,
      recettesFiscalesUsd: 58000,
      variationLoyer3Mois: 1.8,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 5.13,
      tauxCroissancePrixAnnuel: 3.2,
      permisConstruireMois: 38,
      tauxAccessibiliteLogement: 52.1,
      repartitionTypologique: { residential: 76, commercial: 18, mixte: 6 },
      tauxPropriete: 61.2,
      indicePresionFonciere: 1.9,
      region: 'Est',
      zone: 'Urbaine'
    }
  ];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  // Simple color for provinces
  const getProvinceColor = () => {
    return 'hsl(142, 71%, 45%)'; // emerald
  };

  return (
    <div className="w-full h-full max-w-full overflow-hidden">
        {/* Contrôles mobiles - afficher une seule zone à la fois */}
        <div className="lg:hidden p-2 border-b border-border/30 bg-muted/10">
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant={activeMobilePanel==='map' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('map')} aria-label="Carte">
              <MapPin className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={activeMobilePanel==='details' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('details')} aria-label="Détails">
              <Building className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={activeMobilePanel==='analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('analytics')} aria-label="Analytics">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Layout responsive optimisé */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0">
        {/* Carte interactive - Responsive layout */}
        <div className={`${activeMobilePanel !== 'map' ? 'hidden lg:block' : 'flex-1'} lg:col-span-3 order-3 lg:order-1 min-h-0 h-full`}>
          <Card className="card-compact overflow-hidden h-full flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* En-tête responsive */}
              <div className="bg-muted/20 p-1 sm:p-2 border-b border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[10px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>RDC</span>
                  </h2>
                  {/* Contrôles de zoom responsive */}
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="touch-target hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomIn()}
                      title="Zoom avant"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="touch-target hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomOut()}
                      title="Zoom arrière"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Filtre de visualisation responsive */}
                <div className="mt-2">
                  <Select value={activeView} onValueChange={setActiveView}>
                    <SelectTrigger className="w-full h-7 px-2 text-[10px]">
                      <SelectValue placeholder="Vue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provinces" className="text-xs">
                        <span className="hidden md:inline">Cartographie RDC par Province</span>
                        <span className="md:hidden">Provinces RDC</span>
                      </SelectItem>
                      <SelectItem value="territorial" className="text-xs">
                        <span className="hidden md:inline">Cartographie Territoriale</span>
                        <span className="md:hidden">Territorial</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Carte responsive optimisée */}
              <div className="flex-1 min-h-0 p-2 sm:p-3 md:p-4 overflow-hidden">
                {activeView === 'provinces' ? (
                  <DRCMapWithTooltip
                    provincesData={provincesData}
                    selectedProvince={selectedProvince?.id || null}
                    onProvinceSelect={setSelectedProvince}
                    onProvinceHover={setHoveredProvince}
                    hoveredProvince={hoveredProvince}
                    getProvinceColor={getProvinceColor}
                    onMapReady={setMapInstance}
                  />
                ) : (
                  <TerritorialMap />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau données province - Responsive layout */}
        <div className={`${activeMobilePanel !== 'details' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 order-1 lg:order-2 flex-col min-h-0 h-full`}>
          {/* Visualisations avec scroll optimisé */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            <div className="space-y-3 sm:space-y-4 p-2 sm:p-3 md:p-4">
              {selectedProvince && (
                <Card className="card-compact shadow-none border-border/30">
                  <CardHeader className="pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3">
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{selectedProvince.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-2 sm:p-3">
                    <div className="space-y-3">
                      {/* Prix & Valeur - Responsive */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-primary" />
                          Prix & val.
                          <Badge variant="outline" className="text-[9px] px-1 py-0">USD/m²</Badge>
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-1">
                            <div className="text-xs text-muted-foreground">Loyer moyen</div>
                              <div className="text-xs font-bold text-primary">${selectedProvince.prixMoyenLoyer}</div>
                              <div className="text-[10px] text-muted-foreground">par m²/mois</div>
                            </Card>
                            <Card className="p-1">
                              <div className="text-[10px] text-muted-foreground">Prix de vente</div>
                              <div className="text-xs font-bold text-primary">${selectedProvince.prixMoyenVenteM2}</div>
                              <div className="text-[10px] text-muted-foreground">par m²</div>
                          </Card>
                        </div>
                          <Card className="p-1 bg-accent/5">
                            <div className="text-[10px] text-muted-foreground">Valeur foncière parcelle</div>
                            <div className="text-xs font-bold text-accent">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</div>
                          </Card>
                      </div>

                      {/* Performance locative - Compact */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Building className="h-3 w-3 text-primary" />
                          Perf. locative
                        </h5>
                        <div className="grid grid-cols-2 gap-1">
                          <Card className="p-1">
                            <div className="text-xs text-muted-foreground">Taux d'occupation</div>
                              <div className="text-xs font-bold text-green-600">{selectedProvince.tauxOccupationLocatif}%</div>
                              <div className="flex items-center gap-1 text-[10px]">
                              {selectedProvince.tauxOccupationLocatif > 75 ? (
                                <><TrendingUp className="h-2 w-2 text-green-600" /> Élevé</>
                              ) : (
                                <><TrendingDown className="h-2 w-2 text-orange-500" /> Moyen</>
                              )}
                            </div>
                          </Card>
                          <Card className="p-1">
                            <div className="text-xs text-muted-foreground">Durée location</div>
                              <div className="text-xs font-bold text-primary">{selectedProvince.dureeMoyenneMiseLocationJours}</div>
                              <div className="text-[10px] text-muted-foreground">jours</div>
                          </Card>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <Card className="p-1">
                            <div className="text-xs text-muted-foreground">Taux de vacance</div>
                              <div className="text-xs font-bold text-orange-500">{selectedProvince.tauxVacanceLocative}%</div>
                            </Card>
                            <Card className="p-1">
                              <div className="text-[10px] text-muted-foreground">Rendement brut</div>
                              <div className="text-xs font-bold text-emerald-600">{selectedProvince.rendementLocatifBrut ? selectedProvince.rendementLocatifBrut : 0}%</div>
                          </Card>
                        </div>
                      </div>

                      {/* Population & activité - Compact */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 text-primary" />
                          Marché & pop.
                        </h5>
                        <div className="space-y-1">
                          <Card className="p-1">
                            <div className="text-[10px] text-muted-foreground">Population locative</div>
                            <div className="text-xs font-bold text-blue-600">
                              {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k
                            </div>
                            <div className="text-[10px] text-muted-foreground">habitants</div>
                          </Card>
                            <div className="grid grid-cols-2 gap-1">
                              <Card className="p-1">
                                <div className="text-[10px] text-muted-foreground">Transactions</div>
                                <div className="text-xs font-bold text-accent">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</div>
                              </Card>
                              <Card className="p-1">
                                <div className="text-[10px] text-muted-foreground">Annonces</div>
                                <div className="text-xs font-bold text-accent">{formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}</div>
                              </Card>
                            </div>
                        </div>
                      </div>

                      {/* Pression locative - Compact */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          Tension marché
                        </h5>
                        <Card className="p-1">
                          <div className="text-xs text-muted-foreground">Indice de pression</div>
                          <Badge 
                            variant={
                              selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                              selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' :
                              selectedProvince.indicePresionLocative === 'Modéré' ? 'outline' : 'default'
                            }
                            className="text-xs px-1 py-0"
                          >
                            {selectedProvince.indicePresionLocative}
                          </Badge>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Panneau Analytics - Responsive layout */}
        <div className={`${activeMobilePanel !== 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 order-2 lg:order-3 flex-col min-h-0 h-full`}>
          <Card className="flex-1 overflow-hidden card-compact shadow-none">
            <CardHeader className="px-2 py-1 sm:px-3 sm:py-2 border-b border-border/20">
              <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden charts-compact text-[10px]">
              <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                <div className="p-1 sm:p-2 min-h-full">
                  <div className="w-full">
                    <ProvinceDataVisualization 
                      provinces={provincesData} 
                      selectedProvince={selectedProvince}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;
