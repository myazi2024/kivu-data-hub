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
    <div className="w-full h-full p-0.5 sm:p-1">
      {/* Layout mobile-first optimisé */}
      <div className="flex flex-col lg:grid lg:grid-cols-6 gap-0.5 sm:gap-1 h-full">
        {/* Carte interactive - Mobile full width, Desktop 2/6 */}
        <div className="lg:col-span-2 h-[40vh] lg:h-full order-3 lg:order-1">
          <Card className="overflow-hidden h-full flex flex-col border-border/50">
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* En-tête ultra-compact mobile */}
              <div className="bg-muted/20 p-1 sm:p-1.5 border-b border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs sm:text-sm font-medium text-foreground">
                    <span className="hidden sm:inline">RDC - Marché Immobilier</span>
                    <span className="sm:hidden">Marché RDC</span>
                  </h2>
                  
                  {/* Contrôles de zoom compacts */}
                  <div className="flex gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-5 h-5 p-0 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomIn()}
                      title="Zoom avant"
                    >
                      <ZoomIn className="w-2.5 h-2.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-5 h-5 p-0 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomOut()}
                      title="Zoom arrière"
                    >
                      <ZoomOut className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>
                
                {/* Filtre de visualisation compact */}
                <div>
                  <Select value={activeView} onValueChange={setActiveView}>
                    <SelectTrigger className="w-full h-6 sm:h-7 text-[10px] sm:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provinces" className="text-[10px] sm:text-xs">
                        <span className="hidden sm:inline">Cartographie RDC par Province</span>
                        <span className="sm:hidden">RDC Provinces</span>
                      </SelectItem>
                      <SelectItem value="territorial" className="text-[10px] sm:text-xs">
                        <span className="hidden sm:inline">Cartographie Territoriale</span>
                        <span className="sm:hidden">Territorial</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Carte responsive optimisée */}
              <div className="flex-1 min-h-0 p-0.5 overflow-hidden">
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

        {/* Panneau données province - Mobile stack, Desktop 2/6 */}
        <div className="lg:col-span-2 order-1 lg:order-2 h-[35vh] lg:max-h-[85vh] flex flex-col">
          {/* Visualisations compactes avec scroll optimisé */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            <div className="space-y-2 p-1">
              {selectedProvince && (
                <Card className="shadow-none border-border/30">
                  <CardHeader className="pb-1 px-2 pt-2">
                    <CardTitle className="text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="hidden sm:inline">Données détaillées - {selectedProvince.name}</span>
                      <span className="sm:hidden">{selectedProvince.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-2">
                    <div className="space-y-1.5">
                      {/* Prix & Valeur - Compact */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5 text-primary" />
                          Prix & Valeur
                          <Badge variant="outline" className="text-[8px] px-1 py-0">USD/m²</Badge>
                        </h5>
                        <div className="grid grid-cols-2 gap-1">
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Loyer moyen</div>
                            <div className="text-sm font-bold text-primary">${selectedProvince.prixMoyenLoyer}</div>
                            <div className="text-[8px] text-muted-foreground">par m²/mois</div>
                          </Card>
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Prix de vente</div>
                            <div className="text-sm font-bold text-primary">${selectedProvince.prixMoyenVenteM2}</div>
                            <div className="text-[8px] text-muted-foreground">par m²</div>
                          </Card>
                        </div>
                        <Card className="p-1.5 bg-accent/5">
                          <div className="text-[9px] text-muted-foreground">Valeur foncière parcelle</div>
                          <div className="text-base font-bold text-accent">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</div>
                        </Card>
                      </div>

                      {/* Performance locative - Compact */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Building className="h-2.5 w-2.5 text-primary" />
                          Performance Locative
                        </h5>
                        <div className="grid grid-cols-2 gap-1">
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Taux d'occupation</div>
                            <div className="text-sm font-bold text-green-600">{selectedProvince.tauxOccupationLocatif}%</div>
                            <div className="flex items-center gap-0.5 text-[8px]">
                              {selectedProvince.tauxOccupationLocatif > 75 ? (
                                <><TrendingUp className="h-2 w-2 text-green-600" /> Élevé</>
                              ) : (
                                <><TrendingDown className="h-2 w-2 text-orange-500" /> Moyen</>
                              )}
                            </div>
                          </Card>
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Durée location</div>
                            <div className="text-sm font-bold text-primary">{selectedProvince.dureeMoyenneMiseLocationJours}</div>
                            <div className="text-[8px] text-muted-foreground">jours</div>
                          </Card>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Taux de vacance</div>
                            <div className="text-sm font-bold text-orange-500">{selectedProvince.tauxVacanceLocative}%</div>
                          </Card>
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Rendement brut</div>
                            <div className="text-sm font-bold text-emerald-600">{selectedProvince.rendementLocatifBrut ? selectedProvince.rendementLocatifBrut : 0}%</div>
                          </Card>
                        </div>
                      </div>

                      {/* Population & activité - Compact */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Users className="h-2.5 w-2.5 text-primary" />
                          Marché & Population
                        </h5>
                        <div className="space-y-1">
                          <Card className="p-1.5">
                            <div className="text-[9px] text-muted-foreground">Population locative</div>
                            <div className="text-sm font-bold text-blue-600">
                              {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k
                            </div>
                            <div className="text-[8px] text-muted-foreground">habitants</div>
                          </Card>
                          <div className="grid grid-cols-2 gap-1">
                            <Card className="p-1.5">
                              <div className="text-[9px] text-muted-foreground">Transactions</div>
                              <div className="text-sm font-bold text-accent">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</div>
                            </Card>
                            <Card className="p-1.5">
                              <div className="text-[9px] text-muted-foreground">Annonces</div>
                              <div className="text-sm font-bold text-accent">{formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}</div>
                            </Card>
                          </div>
                        </div>
                      </div>

                      {/* Pression locative - Compact */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-primary" />
                          Tension du Marché
                        </h5>
                        <Card className="p-1.5">
                          <div className="text-[9px] text-muted-foreground">Indice de pression</div>
                          <Badge 
                            variant={
                              selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                              selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' :
                              selectedProvince.indicePresionLocative === 'Modéré' ? 'outline' : 'default'
                            }
                            className="text-[9px] px-1.5 py-0.5"
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

        {/* Panneau Analytics - Mobile bottom, Desktop right 2/6 */}
        <div className="lg:col-span-2 order-2 lg:order-3 h-[25vh] lg:max-h-[85vh] flex flex-col">
          <Card className="flex-1 overflow-hidden border-border/30 shadow-none">
            <CardHeader className="pb-1 px-2 py-1.5 border-b border-border/20">
              <CardTitle className="text-xs font-medium text-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-primary" />
                <span className="hidden sm:inline">Analytics Immobilier</span>
                <span className="sm:hidden">Analytics</span>
              </CardTitle>
              <p className="text-[9px] text-muted-foreground hidden sm:block">
                Tendances nationales et comparaisons
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                <div className="p-1.5 min-h-full">
                  <ProvinceDataVisualization 
                    provinces={provincesData} 
                    selectedProvince={selectedProvince}
                  />
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
