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
    <div className="w-full h-full p-1 sm:p-2">
      {/* Layout responsive avec mobile-first */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-1 sm:gap-2 h-full">
        {/* Carte interactive - 2/6 largeur */}
        <div className="lg:col-span-2 h-full order-3 lg:order-1">
          <Card className="shadow-card overflow-hidden h-full flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* En-tête responsive avec contrôles de zoom */}
              <div className="bg-muted/30 p-1.5 sm:p-2 border-b space-y-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">
                    <span className="hidden sm:inline">RDC - Marché Immobilier</span>
                    <span className="sm:hidden">Marché RDC</span>
                  </h2>
                  
                  {/* Contrôles de zoom */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-6 h-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomIn()}
                      title="Zoom avant"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-6 h-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomOut()}
                      title="Zoom arrière"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Filtre de visualisation */}
                <div>
                  <Select value={activeView} onValueChange={setActiveView}>
                    <SelectTrigger className="w-full h-7 sm:h-8 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provinces">Cartographie RDC par Province</SelectItem>
                      <SelectItem value="territorial">Cartographie Territoriale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Carte responsive */}
              <div className="flex-1 min-h-0 p-1 max-h-[60vh] overflow-hidden">
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

        {/* Panneau données province - 2/6 largeur au milieu */}
        <div className="lg:col-span-2 order-1 lg:order-2 max-h-[85vh] flex flex-col">
          {/* Visualisations avancées avec scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="space-y-4 p-2">
              {selectedProvince && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Données détaillées - {selectedProvince.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {/* Prix & Valeur */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Prix & Valeur
                          <Badge variant="outline" className="text-xs">USD/m²</Badge>
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Loyer moyen</div>
                            <div className="text-lg font-bold text-primary">${selectedProvince.prixMoyenLoyer}</div>
                            <div className="text-xs text-muted-foreground">par m²/mois</div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Prix de vente</div>
                            <div className="text-lg font-bold text-primary">${selectedProvince.prixMoyenVenteM2}</div>
                            <div className="text-xs text-muted-foreground">par m²</div>
                          </Card>
                        </div>
                        <Card className="p-3 bg-accent/10">
                          <div className="text-xs text-muted-foreground">Valeur foncière parcelle</div>
                          <div className="text-xl font-bold text-accent">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</div>
                        </Card>
                      </div>

                      {/* Performance locative */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          Performance Locative
                          <Badge variant="outline" className="text-xs">Efficacité marché</Badge>
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Taux d'occupation</div>
                            <div className="text-lg font-bold text-green-600">{selectedProvince.tauxOccupationLocatif}%</div>
                            <div className="flex items-center gap-1 text-xs">
                              {selectedProvince.tauxOccupationLocatif > 75 ? (
                                <><TrendingUp className="h-3 w-3 text-green-600" /> Élevé</>
                              ) : (
                                <><TrendingDown className="h-3 w-3 text-orange-500" /> Moyen</>
                              )}
                            </div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Durée location</div>
                            <div className="text-lg font-bold text-primary">{selectedProvince.dureeMoyenneMiseLocationJours}</div>
                            <div className="text-xs text-muted-foreground">jours en moyenne</div>
                          </Card>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Taux de vacance</div>
                            <div className="text-lg font-bold text-orange-500">{selectedProvince.tauxVacanceLocative}%</div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Rendement brut</div>
                            <div className="text-lg font-bold text-emerald-600">{selectedProvince.rendementLocatifBrut ? selectedProvince.rendementLocatifBrut : 0}%</div>
                          </Card>
                        </div>
                      </div>

                      {/* Population & activité */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Marché & Population
                        </h5>
                        <div className="grid grid-cols-1 gap-2">
                          <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Population locative</div>
                            <div className="text-lg font-bold text-blue-600">
                              {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k
                            </div>
                            <div className="text-xs text-muted-foreground">habitants concernés</div>
                          </Card>
                          <div className="grid grid-cols-2 gap-2">
                            <Card className="p-3">
                              <div className="text-xs text-muted-foreground">Transactions</div>
                              <div className="text-lg font-bold text-accent">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</div>
                            </Card>
                            <Card className="p-3">
                              <div className="text-xs text-muted-foreground">Annonces</div>
                              <div className="text-lg font-bold text-accent">{formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}</div>
                            </Card>
                          </div>
                        </div>
                      </div>

                      {/* Pression locative */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Tension du Marché
                        </h5>
                        <Card className="p-3">
                          <div className="text-xs text-muted-foreground">Indice de pression</div>
                          <Badge 
                            variant={
                              selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                              selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' :
                              selectedProvince.indicePresionLocative === 'Modéré' ? 'outline' : 'default'
                            }
                            className="text-sm px-3 py-1"
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

        {/* Panneau Analytics - 2/6 largeur à droite */}
        <div className="lg:col-span-2 order-2 lg:order-3 max-h-[85vh] flex flex-col">
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Analytics Immobilier
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Tendances nationales et comparaisons inter-provinciales
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent p-4">
              <div className="min-h-[600px]">
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

export default DRCInteractiveMap;
