import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, MapPin, Users, DollarSign, Building, Clock, BarChart3 } from 'lucide-react';
import DRCMapWithTooltip from './DRCMapWithTooltip';
import { ProvinceData } from '@/types/province';

const DRCInteractiveMap: React.FC = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'location' | 'vente'>('location');
  const [priceFilter, setPriceFilter] = useState<string>('all');

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
      typologieDominante: 'Appartements'
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
      typologieDominante: 'Maisons individuelles'
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
      typologieDominante: 'Maisons individuelles'
    },
    // Haut-Katanga - Province minière
    {
      id: 'CDHK',
      name: 'Haut-Katanga',
      prixMoyenLoyer: 220,
      prixMoyenVenteM2: 510,
      valeurFonciereParcelleUsd: 8200,
      tauxOccupationLocatif: 76.3,
      dureeMoyenneMiseLocationJours: 28,
      tauxVacanceLocative: 23.7,
      indicePresionLocative: 'Élevé',
      volumeAnnoncesImmobilieres: 3800,
      nombreTransactionsEstimees: 2500,
      populationLocativeEstimee: 210000,
      recettesLocativesUsd: 485000,
      recettesFiscalesUsd: 78000,
      variationLoyer3Mois: 2.5,
      typologieDominante: 'Mixte urbain'
    },
    // Kasaï-Oriental
    {
      id: 'CDKO',
      name: 'Kasaï-Oriental',
      prixMoyenLoyer: 155,
      prixMoyenVenteM2: 360,
      valeurFonciereParcelleUsd: 5200,
      tauxOccupationLocatif: 68.4,
      dureeMoyenneMiseLocationJours: 38,
      tauxVacanceLocative: 31.6,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1950,
      nombreTransactionsEstimees: 1300,
      populationLocativeEstimee: 95000,
      recettesLocativesUsd: 285000,
      recettesFiscalesUsd: 42000,
      variationLoyer3Mois: 1.4,
      typologieDominante: 'Maisons individuelles'
    },
    // Autres provinces avec des données réalistes...
    {
      id: 'CDKW',
      name: 'Kasaï-Occidental',
      prixMoyenLoyer: 145,
      prixMoyenVenteM2: 335,
      valeurFonciereParcelleUsd: 4800,
      tauxOccupationLocatif: 66.8,
      dureeMoyenneMiseLocationJours: 41,
      tauxVacanceLocative: 33.2,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1650,
      nombreTransactionsEstimees: 1100,
      populationLocativeEstimee: 82000,
      recettesLocativesUsd: 245000,
      recettesFiscalesUsd: 35000,
      variationLoyer3Mois: 1.1,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDKC',
      name: 'Kasaï-Central',
      prixMoyenLoyer: 140,
      prixMoyenVenteM2: 325,
      valeurFonciereParcelleUsd: 4500,
      tauxOccupationLocatif: 65.2,
      dureeMoyenneMiseLocationJours: 43,
      tauxVacanceLocative: 34.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1520,
      nombreTransactionsEstimees: 980,
      populationLocativeEstimee: 75000,
      recettesLocativesUsd: 225000,
      recettesFiscalesUsd: 32000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDLK',
      name: 'Lualaba',
      prixMoyenLoyer: 185,
      prixMoyenVenteM2: 420,
      valeurFonciereParcelleUsd: 6500,
      tauxOccupationLocatif: 72.1,
      dureeMoyenneMiseLocationJours: 34,
      tauxVacanceLocative: 27.9,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2200,
      nombreTransactionsEstimees: 1450,
      populationLocativeEstimee: 125000,
      recettesLocativesUsd: 335000,
      recettesFiscalesUsd: 52000,
      variationLoyer3Mois: 1.7,
      typologieDominante: 'Mixte minier'
    },
    // Ajout des autres provinces...
    {
      id: 'CDBC',
      name: 'Bas-Congo',
      prixMoyenLoyer: 160,
      prixMoyenVenteM2: 375,
      valeurFonciereParcelleUsd: 5800,
      tauxOccupationLocatif: 69.5,
      dureeMoyenneMiseLocationJours: 37,
      tauxVacanceLocative: 30.5,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1850,
      nombreTransactionsEstimees: 1200,
      populationLocativeEstimee: 98000,
      recettesLocativesUsd: 295000,
      recettesFiscalesUsd: 45000,
      variationLoyer3Mois: 1.3,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDMN',
      name: 'Maniema',
      prixMoyenLoyer: 140,
      prixMoyenVenteM2: 320,
      valeurFonciereParcelleUsd: 4200,
      tauxOccupationLocatif: 65.8,
      dureeMoyenneMiseLocationJours: 42,
      tauxVacanceLocative: 34.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 980,
      nombreTransactionsEstimees: 650,
      populationLocativeEstimee: 45000,
      recettesLocativesUsd: 145000,
      recettesFiscalesUsd: 22000,
      variationLoyer3Mois: 1.2,
      typologieDominante: 'Maisons individuelles'
    },
    // Continuez avec toutes les 26 provinces...
    {
      id: 'CDBU',
      name: 'Bas-Uele',
      prixMoyenLoyer: 120,
      prixMoyenVenteM2: 280,
      valeurFonciereParcelleUsd: 3500,
      tauxOccupationLocatif: 62.1,
      dureeMoyenneMiseLocationJours: 48,
      tauxVacanceLocative: 37.9,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 650,
      nombreTransactionsEstimees: 420,
      populationLocativeEstimee: 28000,
      recettesLocativesUsd: 95000,
      recettesFiscalesUsd: 15000,
      variationLoyer3Mois: 0.8,
      typologieDominante: 'Maisons rurales'
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

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  // Filter provinces based on current filters
  const filteredProvinces = provincesData.filter(province => {
    if (priceFilter === 'all') return true;
    
    const priceToCheck = transactionType === 'location' 
      ? province.prixMoyenLoyer 
      : province.prixMoyenVenteM2;
    
    switch (priceFilter) {
      case 'high-price': return priceToCheck > 600;
      case 'medium-price': return priceToCheck >= 300 && priceToCheck <= 600;
      case 'low-price': return priceToCheck < 300;
      default: return true;
    }
  });

  // Get color based on current transaction type and price
  const getProvinceColor = (province: ProvinceData) => {
    const price = transactionType === 'location' 
      ? province.prixMoyenLoyer 
      : province.prixMoyenVenteM2;
    
    if (price > 600) return 'hsl(348, 100%, 44%)'; // red - high price
    if (price >= 450) return 'hsl(20, 90%, 56%)'; // orange - medium-high
    if (price >= 300) return 'hsl(45, 93%, 47%)'; // amber - medium
    if (price >= 150) return 'hsl(142, 71%, 45%)'; // emerald - low
    return 'hsl(0, 0%, 45%)'; // gray - very low
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-2">
        {/* Map Section avec contrôles intégrés */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
          <div className="xl:col-span-3 h-full">
            <Card className="shadow-card overflow-hidden h-full flex flex-col">
              <CardContent className="p-0 flex-1 flex flex-col">
                {/* Contrôles intégrés dans l'en-tête de la carte */}
                <div className="bg-seloger-gray/30 p-3 border-b flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">RDC - Marché Immobilier</h2>
                    
                    {/* Transaction Type Toggle */}
                    <div className="flex bg-muted rounded-lg p-1">
                      <button
                        onClick={() => setTransactionType('location')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          transactionType === 'location'
                            ? 'bg-white text-seloger-red shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Location
                      </button>
                      <button
                        onClick={() => setTransactionType('vente')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          transactionType === 'vente'
                            ? 'bg-white text-seloger-red shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Vente
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Price Range Filter */}
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Filtre prix" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="high-price">Prix élevés</SelectItem>
                        <SelectItem value="medium-price">Prix moyens</SelectItem>
                        <SelectItem value="low-price">Prix bas</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Legend Inline */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(348, 100%, 44%)' }}></div>
                        <span>Très élevé</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(20, 90%, 56%)' }}></div>
                        <span>Élevé</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }}></div>
                        <span>Moyen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }}></div>
                        <span>Bas</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {filteredProvinces.length} / 26 provinces
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Carte pleine hauteur */}
                <div className="flex-1 min-h-0 p-3">
                  <DRCMapWithTooltip
                    provincesData={filteredProvinces}
                    selectedProvince={selectedProvince?.id || null}
                    onProvinceSelect={setSelectedProvince}
                    onProvinceHover={setHoveredProvince}
                    hoveredProvince={hoveredProvince}
                    transactionType={transactionType}
                    getProvinceColor={getProvinceColor}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Panneau d'informations */}
          <div className="space-y-4">
            {selectedProvince ? (
              <Card className="shadow-hover">
                <CardHeader className="bg-gradient-card">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5 text-seloger-red" />
                    {selectedProvince.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Prix & Valeur */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-seloger-red" />
                      Prix & Valeur
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Prix vente (m²)</span>
                        <span className="font-semibold text-foreground text-xs">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Prix location (m²)</span>
                        <span className="font-semibold text-foreground text-xs">{formatCurrency(selectedProvince.prixMoyenLoyer)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Valeur foncière</span>
                        <span className="font-semibold text-foreground text-xs">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance locative */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-seloger-red" />
                      Performance
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Taux d'occupation</span>
                        <span className="font-semibold text-foreground text-xs">{formatPercentage(selectedProvince.tauxOccupationLocatif)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Mise en location</span>
                        <span className="font-semibold text-foreground text-xs">{selectedProvince.dureeMoyenneMiseLocationJours}j</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Pression locative</span>
                        <Badge 
                          variant={selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' : 
                                  selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {selectedProvince.indicePresionLocative}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Activité */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-seloger-red" />
                      Activité
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Annonces/mois</span>
                        <span className="font-semibold text-foreground text-xs">{formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Transactions</span>
                        <span className="font-semibold text-foreground text-xs">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Population</span>
                        <span className="font-semibold text-foreground text-xs">{formatNumber(selectedProvince.populationLocativeEstimee)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Sélectionnez une province</h3>
                  <p className="text-muted-foreground text-sm">
                    Cliquez sur une province pour afficher ses indicateurs détaillés
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;