import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, MapPin, Users, DollarSign, Building, Clock, BarChart3 } from 'lucide-react';
import DRCMap from './DRCMap';

interface ProvinceData {
  id: string;
  name: string;
  // Prix & Valeur
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  valeurFonciereParcelleUsd: number;
  // Performance locative
  tauxOccupationLocatif: number;
  dureeMoyenneMiseLocationJours: number;
  tauxVacanceLocative: number;
  indicePresionLocative: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  // Activité du marché
  volumeAnnoncesImmobilieres: number;
  nombreTransactionsEstimees: number;
  // Population & usage
  populationLocativeEstimee: number;
  // Recettes & fiscalité
  recettesLocativesUsd: number;
  recettesFiscalesUsd: number;
  // Autres
  variationLoyer3Mois: number;
  typologieDominante: string;
}

const DRCInteractiveMap: React.FC = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'location' | 'vente'>('location');
  const [priceFilter, setPriceFilter] = useState<string>('all');

  // Mock data for the provinces with enhanced data structure
  const provincesData: ProvinceData[] = [
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
      volumeAnnoncesImmobilieres: 12500,
      nombreTransactionsEstimees: 8964,
      populationLocativeEstimee: 425000,
      recettesLocativesUsd: 1950000,
      recettesFiscalesUsd: 285000,
      variationLoyer3Mois: 5.1,
      typologieDominante: 'Usage mixte'
    },
    {
      id: 'CDBC',
      name: 'Kongo-Central',
      prixMoyenLoyer: 180,
      prixMoyenVenteM2: 420,
      valeurFonciereParcelleUsd: 6500,
      tauxOccupationLocatif: 67.9,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 32.1,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2100,
      nombreTransactionsEstimees: 1250,
      populationLocativeEstimee: 89000,
      recettesLocativesUsd: 289000,
      recettesFiscalesUsd: 45000,
      variationLoyer3Mois: 2.3,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDHK',
      name: 'Haut-Katanga',
      prixMoyenLoyer: 280,
      prixMoyenVenteM2: 650,
      valeurFonciereParcelleUsd: 12500,
      tauxOccupationLocatif: 83.8,
      dureeMoyenneMiseLocationJours: 18,
      tauxVacanceLocative: 16.2,
      indicePresionLocative: 'Très élevé',
      volumeAnnoncesImmobilieres: 7500,
      nombreTransactionsEstimees: 5280,
      populationLocativeEstimee: 185000,
      recettesLocativesUsd: 935000,
      recettesFiscalesUsd: 165000,
      variationLoyer3Mois: 4.8,
      typologieDominante: 'Usage mixte'
    },
    {
      id: 'CDNK',
      name: 'Nord-Kivu',
      prixMoyenLoyer: 250,
      prixMoyenVenteM2: 580,
      valeurFonciereParcelleUsd: 9500,
      tauxOccupationLocatif: 77.7,
      dureeMoyenneMiseLocationJours: 24,
      tauxVacanceLocative: 22.3,
      indicePresionLocative: 'Élevé',
      volumeAnnoncesImmobilieres: 6200,
      nombreTransactionsEstimees: 4349,
      populationLocativeEstimee: 152000,
      recettesLocativesUsd: 685000,
      recettesFiscalesUsd: 125000,
      variationLoyer3Mois: 3.8,
      typologieDominante: 'Usage mixte'
    },
    {
      id: 'CDSK',
      name: 'Sud-Kivu',
      prixMoyenLoyer: 200,
      prixMoyenVenteM2: 480,
      valeurFonciereParcelleUsd: 7500,
      tauxOccupationLocatif: 78.5,
      dureeMoyenneMiseLocationJours: 28,
      tauxVacanceLocative: 21.5,
      indicePresionLocative: 'Élevé',
      volumeAnnoncesImmobilieres: 3200,
      nombreTransactionsEstimees: 2150,
      populationLocativeEstimee: 125000,
      recettesLocativesUsd: 425000,
      recettesFiscalesUsd: 68000,
      variationLoyer3Mois: 3.2,
      typologieDominante: 'Maisons urbaines'
    },
    {
      id: 'CDLU',
      name: 'Lualaba',
      prixMoyenLoyer: 220,
      prixMoyenVenteM2: 510,
      valeurFonciereParcelleUsd: 8500,
      tauxOccupationLocatif: 81.1,
      dureeMoyenneMiseLocationJours: 22,
      tauxVacanceLocative: 18.9,
      indicePresionLocative: 'Élevé',
      volumeAnnoncesImmobilieres: 3800,
      nombreTransactionsEstimees: 2480,
      populationLocativeEstimee: 105000,
      recettesLocativesUsd: 485000,
      recettesFiscalesUsd: 78000,
      variationLoyer3Mois: 4.1,
      typologieDominante: 'Usage mixte'
    },
    {
      id: 'CDKC',
      name: 'Kasaï-Central',
      prixMoyenLoyer: 170,
      prixMoyenVenteM2: 390,
      valeurFonciereParcelleUsd: 5800,
      tauxOccupationLocatif: 73.6,
      dureeMoyenneMiseLocationJours: 35,
      tauxVacanceLocative: 26.4,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2050,
      nombreTransactionsEstimees: 1450,
      populationLocativeEstimee: 85000,
      recettesLocativesUsd: 260000,
      recettesFiscalesUsd: 42000,
      variationLoyer3Mois: 2.1,
      typologieDominante: 'Maisons urbaines'
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
      {/* Header Section */}
      <div className="bg-gradient-hero text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Carte interactive du marché immobilier RDC
            </h1>
            <p className="text-lg text-white/90 max-w-3xl mx-auto">
              Sélectionnez une province pour explorer les indicateurs immobiliers locaux. 
              Les données affichées sont issues d'analyses périodiques et de modélisations territoriales.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Price Filters Section */}
        <div className="mb-8">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-seloger-red" />
                  <div>
                    <h3 className="font-semibold text-foreground">Prix de l'immobilier au m²</h3>
                    <p className="text-sm text-muted-foreground">Comparez les prix de location et de vente</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Transaction Type Toggle */}
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setTransactionType('location')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        transactionType === 'location'
                          ? 'bg-white text-seloger-red shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Location
                    </button>
                    <button
                      onClick={() => setTransactionType('vente')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        transactionType === 'vente'
                          ? 'bg-white text-seloger-red shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Vente
                    </button>
                  </div>

                  {/* Price Range Filter */}
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Fourchette de prix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les provinces</SelectItem>
                      <SelectItem value="high-price">Prix élevés (&gt;600 USD)</SelectItem>
                      <SelectItem value="medium-price">Prix moyens (300-600 USD)</SelectItem>
                      <SelectItem value="low-price">Prix bas (&lt;300 USD)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Market Activity Filter */}
                  <Select value="activity" onValueChange={() => {}}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Activité marché" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="high">Très active</SelectItem>
                      <SelectItem value="moderate">Active</SelectItem>
                      <SelectItem value="low">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map and Data Container */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
          {/* Map Section */}
          <div className="xl:col-span-3">
            <Card className="shadow-card overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-seloger-gray/30 p-4 border-b">
                  <h2 className="text-xl font-semibold text-foreground">République Démocratique du Congo</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Cliquez sur une province pour afficher ses indicateurs détaillés
                  </p>
                </div>
                <div className="p-6 h-96 lg:h-[500px]">
                  <DRCMap
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

          {/* Info Panel */}
          <div className="space-y-6">
            {selectedProvince ? (
              <Card className="shadow-hover">
                <CardHeader className="bg-gradient-card">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5 text-seloger-red" />
                    {selectedProvince.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Prix & Valeur */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
                      <DollarSign className="h-4 w-4 text-seloger-red" />
                      Prix & Valeur
                    </h3>
                    <div className="bg-seloger-gray/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Prix moyen vente (m²)</span>
                        <span className="font-semibold text-foreground">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Prix moyen location (m²)</span>
                        <span className="font-semibold text-foreground">{formatCurrency(selectedProvince.prixMoyenLoyer)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Valeur foncière/parcelle</span>
                        <span className="font-semibold text-foreground">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance locative */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Building className="h-4 w-4 text-seloger-red" />
                      Performance locative
                    </h3>
                    <div className="bg-seloger-gray/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Taux d'occupation</span>
                        <span className="font-semibold text-foreground">{formatPercentage(selectedProvince.tauxOccupationLocatif)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Durée mise en location</span>
                        <span className="font-semibold text-foreground">{selectedProvince.dureeMoyenneMiseLocationJours}j</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Taux de vacance</span>
                        <span className="font-semibold text-foreground">{formatPercentage(selectedProvince.tauxVacanceLocative)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Pression locative</span>
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

                  {/* Activité du marché */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
                      <BarChart3 className="h-4 w-4 text-seloger-red" />
                      Activité du marché
                    </h3>
                    <div className="bg-seloger-gray/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Volume d'annonces</span>
                        <span className="font-semibold text-foreground">{selectedProvince.volumeAnnoncesImmobilieres.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Transactions estimées</span>
                        <span className="font-semibold text-foreground">{selectedProvince.nombreTransactionsEstimees.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Évolution */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Clock className="h-4 w-4 text-seloger-red" />
                      Évolution récente
                    </h3>
                    <div className="bg-seloger-gray/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Variation loyer (3 mois)</span>
                        <div className="flex items-center gap-2">
                          {selectedProvince.variationLoyer3Mois >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-seloger-red" />
                          )}
                          <span className={`font-semibold ${
                            selectedProvince.variationLoyer3Mois >= 0 ? 'text-emerald-600' : 'text-seloger-red'
                          }`}>
                            {selectedProvince.variationLoyer3Mois >= 0 ? '+' : ''}{formatPercentage(selectedProvince.variationLoyer3Mois)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Sélectionnez une province
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Cliquez sur une province de la carte pour afficher ses indicateurs immobiliers détaillés.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Statistiques générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-seloger-gray/30 rounded-lg">
                    <div className="text-2xl font-bold text-seloger-red">26</div>
                    <div className="text-xs text-muted-foreground uppercase">Provinces</div>
                  </div>
                  <div className="text-center p-3 bg-seloger-gray/30 rounded-lg">
                    <div className="text-2xl font-bold text-seloger-red">145</div>
                    <div className="text-xs text-muted-foreground uppercase">Villes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Indicators Legend */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">📊 Indicateurs disponibles</CardTitle>
            <p className="text-muted-foreground">Vue d'ensemble des métriques immobilières analysées</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3 p-4 bg-seloger-gray/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-seloger-red" />
                  <h4 className="font-semibold text-foreground">Activité du marché</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Volume d'annonces immobilières</li>
                  <li>• Nombre de transactions estimées</li>
                </ul>
              </div>
              <div className="space-y-3 p-4 bg-seloger-gray/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-seloger-red" />
                  <h4 className="font-semibold text-foreground">Prix & Valeur</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prix moyen de vente (m²)</li>
                  <li>• Prix moyen de location (m²)</li>
                  <li>• Valeur foncière moyenne</li>
                </ul>
              </div>
              <div className="space-y-3 p-4 bg-seloger-gray/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-seloger-red" />
                  <h4 className="font-semibold text-foreground">Performance locative</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Taux d'occupation locatif</li>
                  <li>• Durée de mise en location</li>
                  <li>• Indice de pression locative</li>
                </ul>
              </div>
              <div className="space-y-3 p-4 bg-seloger-gray/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-seloger-red" />
                  <h4 className="font-semibold text-foreground">Population & fiscalité</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Population locative estimée</li>
                  <li>• Recettes locatives</li>
                  <li>• Recettes fiscales estimées</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-seloger-red" />
                  Utilisation des filtres
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground">Province</h4>
                    <p className="text-sm text-muted-foreground">Affiche les données agrégées à l'échelle provinciale pour une vue d'ensemble du marché local.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Ville</h4>
                    <p className="text-sm text-muted-foreground">Permet une analyse fine par centre urbain ou commune pour des décisions ciblées.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-seloger-red" />
                Objectif de la plateforme
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Cette carte vise à fournir une lecture dynamique du marché immobilier congolais, en facilitant :
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-seloger-red font-bold">•</span>
                  La prise de décision pour les investisseurs et les autorités locales
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-seloger-red font-bold">•</span>
                  Le suivi des dynamiques urbaines et fiscales
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-seloger-red font-bold">•</span>
                  L'identification des zones à forte pression locative ou à potentiel de développement
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;
