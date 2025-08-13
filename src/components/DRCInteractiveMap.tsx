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
      volumeAnnoncesImmobilieres: 12500,
      nombreTransactionsEstimees: 8964,
      populationLocativeEstimee: 425000,
      recettesLocativesUsd: 1950000,
      recettesFiscalesUsd: 285000,
      variationLoyer3Mois: 5.1,
      typologieDominante: 'Usage mixte'
    },
    // Haut-Katanga - Centre minier important
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
    // Nord-Kivu - Goma et région active
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
    // Sud-Kivu - Bukavu
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
    // Lualaba - Région minière
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
    // Kongo-Central - Proche de Kinshasa
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
    // Kasaï-Central
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
    },
    // Kasaï-Oriental
    {
      id: 'CDKE',
      name: 'Kasaï-Oriental',
      prixMoyenLoyer: 160,
      prixMoyenVenteM2: 380,
      valeurFonciereParcelleUsd: 5200,
      tauxOccupationLocatif: 71.3,
      dureeMoyenneMiseLocationJours: 38,
      tauxVacanceLocative: 28.7,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1800,
      nombreTransactionsEstimees: 1200,
      populationLocativeEstimee: 78000,
      recettesLocativesUsd: 235000,
      recettesFiscalesUsd: 38000,
      variationLoyer3Mois: 1.8,
      typologieDominante: 'Maisons urbaines'
    },
    // Tshopo - Kisangani
    {
      id: 'CDTO',
      name: 'Tshopo',
      prixMoyenLoyer: 190,
      prixMoyenVenteM2: 450,
      valeurFonciereParcelleUsd: 6800,
      tauxOccupationLocatif: 74.2,
      dureeMoyenneMiseLocationJours: 32,
      tauxVacanceLocative: 25.8,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2800,
      nombreTransactionsEstimees: 1850,
      populationLocativeEstimee: 112000,
      recettesLocativesUsd: 340000,
      recettesFiscalesUsd: 58000,
      variationLoyer3Mois: 2.7,
      typologieDominante: 'Usage mixte'
    },
    // Équateur
    {
      id: 'CDEQ',
      name: 'Équateur',
      prixMoyenLoyer: 155,
      prixMoyenVenteM2: 360,
      valeurFonciereParcelleUsd: 4800,
      tauxOccupationLocatif: 68.9,
      dureeMoyenneMiseLocationJours: 40,
      tauxVacanceLocative: 31.1,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1450,
      nombreTransactionsEstimees: 980,
      populationLocativeEstimee: 62000,
      recettesLocativesUsd: 195000,
      recettesFiscalesUsd: 28000,
      variationLoyer3Mois: 1.5,
      typologieDominante: 'Maisons individuelles'
    },
    // Maniema
    {
      id: 'CDMA',
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
    // Kwilu
    {
      id: 'CDKL',
      name: 'Kwilu',
      prixMoyenLoyer: 145,
      prixMoyenVenteM2: 340,
      valeurFonciereParcelleUsd: 4500,
      tauxOccupationLocatif: 66.4,
      dureeMoyenneMiseLocationJours: 44,
      tauxVacanceLocative: 33.6,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1250,
      nombreTransactionsEstimees: 820,
      populationLocativeEstimee: 58000,
      recettesLocativesUsd: 168000,
      recettesFiscalesUsd: 25000,
      variationLoyer3Mois: 1.1,
      typologieDominante: 'Maisons individuelles'
    },
    // Bas-Uele
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
    },
    // Haut-Uele
    {
      id: 'CDHU',
      name: 'Haut-Uele',
      prixMoyenLoyer: 125,
      prixMoyenVenteM2: 290,
      valeurFonciereParcelleUsd: 3800,
      tauxOccupationLocatif: 63.5,
      dureeMoyenneMiseLocationJours: 46,
      tauxVacanceLocative: 36.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 720,
      nombreTransactionsEstimees: 480,
      populationLocativeEstimee: 32000,
      recettesLocativesUsd: 108000,
      recettesFiscalesUsd: 18000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons rurales'
    },
    // Ituri
    {
      id: 'CDIT',
      name: 'Ituri',
      prixMoyenLoyer: 165,
      prixMoyenVenteM2: 385,
      valeurFonciereParcelleUsd: 5500,
      tauxOccupationLocatif: 70.8,
      dureeMoyenneMiseLocationJours: 36,
      tauxVacanceLocative: 29.2,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1600,
      nombreTransactionsEstimees: 1100,
      populationLocativeEstimee: 72000,
      recettesLocativesUsd: 215000,
      recettesFiscalesUsd: 35000,
      variationLoyer3Mois: 2.0,
      typologieDominante: 'Usage mixte'
    },
    // Haut-Lomami
    {
      id: 'CDHL',
      name: 'Haut-Lomami',
      prixMoyenLoyer: 175,
      prixMoyenVenteM2: 410,
      valeurFonciereParcelleUsd: 6200,
      tauxOccupationLocatif: 72.4,
      dureeMoyenneMiseLocationJours: 34,
      tauxVacanceLocative: 27.6,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1850,
      nombreTransactionsEstimees: 1300,
      populationLocativeEstimee: 75000,
      recettesLocativesUsd: 245000,
      recettesFiscalesUsd: 40000,
      variationLoyer3Mois: 2.5,
      typologieDominante: 'Maisons urbaines'
    },
    // Lomami
    {
      id: 'CDLO',
      name: 'Lomami',
      prixMoyenLoyer: 150,
      prixMoyenVenteM2: 350,
      valeurFonciereParcelleUsd: 4600,
      tauxOccupationLocatif: 67.8,
      dureeMoyenneMiseLocationJours: 41,
      tauxVacanceLocative: 32.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1200,
      nombreTransactionsEstimees: 800,
      populationLocativeEstimee: 55000,
      recettesLocativesUsd: 175000,
      recettesFiscalesUsd: 26000,
      variationLoyer3Mois: 1.4,
      typologieDominante: 'Maisons individuelles'
    },
    // Tanganyika
    {
      id: 'CDTA',
      name: 'Tanganyika',
      prixMoyenLoyer: 185,
      prixMoyenVenteM2: 430,
      valeurFonciereParcelleUsd: 6000,
      tauxOccupationLocatif: 75.2,
      dureeMoyenneMiseLocationJours: 30,
      tauxVacanceLocative: 24.8,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2200,
      nombreTransactionsEstimees: 1600,
      populationLocativeEstimee: 95000,
      recettesLocativesUsd: 295000,
      recettesFiscalesUsd: 48000,
      variationLoyer3Mois: 2.8,
      typologieDominante: 'Usage mixte'
    },
    // Kasaï
    {
      id: 'CDKS',
      name: 'Kasaï',
      prixMoyenLoyer: 135,
      prixMoyenVenteM2: 315,
      valeurFonciereParcelleUsd: 4000,
      tauxOccupationLocatif: 64.5,
      dureeMoyenneMiseLocationJours: 43,
      tauxVacanceLocative: 35.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 950,
      nombreTransactionsEstimees: 620,
      populationLocativeEstimee: 42000,
      recettesLocativesUsd: 135000,
      recettesFiscalesUsd: 20000,
      variationLoyer3Mois: 1.0,
      typologieDominante: 'Maisons rurales'
    },
    // Sankuru
    {
      id: 'CDSA',
      name: 'Sankuru',
      prixMoyenLoyer: 130,
      prixMoyenVenteM2: 305,
      valeurFonciereParcelleUsd: 3800,
      tauxOccupationLocatif: 63.8,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 36.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 850,
      nombreTransactionsEstimees: 550,
      populationLocativeEstimee: 38000,
      recettesLocativesUsd: 125000,
      recettesFiscalesUsd: 18000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons rurales'
    },
    // Kwango
    {
      id: 'CDKG',
      name: 'Kwango',
      prixMoyenLoyer: 128,
      prixMoyenVenteM2: 300,
      valeurFonciereParcelleUsd: 3600,
      tauxOccupationLocatif: 62.8,
      dureeMoyenneMiseLocationJours: 47,
      tauxVacanceLocative: 37.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 780,
      nombreTransactionsEstimees: 500,
      populationLocativeEstimee: 35000,
      recettesLocativesUsd: 115000,
      recettesFiscalesUsd: 16000,
      variationLoyer3Mois: 0.7,
      typologieDominante: 'Maisons rurales'
    },
    // Maï-Ndombe
    {
      id: 'CDMN',
      name: 'Maï-Ndombe',
      prixMoyenLoyer: 115,
      prixMoyenVenteM2: 270,
      valeurFonciereParcelleUsd: 3200,
      tauxOccupationLocatif: 60.5,
      dureeMoyenneMiseLocationJours: 50,
      tauxVacanceLocative: 39.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 580,
      nombreTransactionsEstimees: 380,
      populationLocativeEstimee: 25000,
      recettesLocativesUsd: 85000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons rurales'
    },
    // Mongala
    {
      id: 'CDMO',
      name: 'Mongala',
      prixMoyenLoyer: 122,
      prixMoyenVenteM2: 285,
      valeurFonciereParcelleUsd: 3400,
      tauxOccupationLocatif: 61.8,
      dureeMoyenneMiseLocationJours: 49,
      tauxVacanceLocative: 38.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 680,
      nombreTransactionsEstimees: 450,
      populationLocativeEstimee: 30000,
      recettesLocativesUsd: 98000,
      recettesFiscalesUsd: 14000,
      variationLoyer3Mois: 0.6,
      typologieDominante: 'Maisons rurales'
    },
    // Nord-Ubangi
    {
      id: 'CDNU',
      name: 'Nord-Ubangi',
      prixMoyenLoyer: 110,
      prixMoyenVenteM2: 260,
      valeurFonciereParcelleUsd: 3000,
      tauxOccupationLocatif: 59.2,
      dureeMoyenneMiseLocationJours: 52,
      tauxVacanceLocative: 40.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 520,
      nombreTransactionsEstimees: 340,
      populationLocativeEstimee: 22000,
      recettesLocativesUsd: 75000,
      recettesFiscalesUsd: 10000,
      variationLoyer3Mois: 0.4,
      typologieDominante: 'Maisons rurales'
    },
    // Sud-Ubangi
    {
      id: 'CDSU',
      name: 'Sud-Ubangi',
      prixMoyenLoyer: 118,
      prixMoyenVenteM2: 275,
      valeurFonciereParcelleUsd: 3300,
      tauxOccupationLocatif: 60.8,
      dureeMoyenneMiseLocationJours: 51,
      tauxVacanceLocative: 39.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 620,
      nombreTransactionsEstimees: 410,
      populationLocativeEstimee: 27000,
      recettesLocativesUsd: 88000,
      recettesFiscalesUsd: 13000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons rurales'
    },
    // Tshuapa
    {
      id: 'CDTU',
      name: 'Tshuapa',
      prixMoyenLoyer: 125,
      prixMoyenVenteM2: 295,
      valeurFonciereParcelleUsd: 3500,
      tauxOccupationLocatif: 62.5,
      dureeMoyenneMiseLocationJours: 48,
      tauxVacanceLocative: 37.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 750,
      nombreTransactionsEstimees: 480,
      populationLocativeEstimee: 33000,
      recettesLocativesUsd: 105000,
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

        {/* Color Legend Section */}
        <div className="mb-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                🎨 Légende des couleurs
                <Badge variant="outline" className="text-xs">
                  {transactionType === 'location' ? 'Prix location' : 'Prix vente'} par m²
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Code couleur basé sur les prix de {transactionType} au mètre carré
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded border-2 border-white" 
                    style={{ backgroundColor: 'hsl(348, 100%, 44%)' }}
                  ></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Prix très élevés</div>
                    <div className="text-xs text-muted-foreground">&gt; 600 USD/m²</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded border-2 border-white" 
                    style={{ backgroundColor: 'hsl(20, 90%, 56%)' }}
                  ></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Prix élevés</div>
                    <div className="text-xs text-muted-foreground">450-600 USD/m²</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded border-2 border-white" 
                    style={{ backgroundColor: 'hsl(45, 93%, 47%)' }}
                  ></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Prix moyens</div>
                    <div className="text-xs text-muted-foreground">300-450 USD/m²</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded border-2 border-white" 
                    style={{ backgroundColor: 'hsl(142, 71%, 45%)' }}
                  ></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Prix bas</div>
                    <div className="text-xs text-muted-foreground">150-300 USD/m²</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded border-2 border-white" 
                    style={{ backgroundColor: 'hsl(0, 0%, 45%)' }}
                  ></div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">Prix très bas</div>
                    <div className="text-xs text-muted-foreground">&lt; 150 USD/m²</div>
                  </div>
                </div>
              </div>
              
              {/* Active Filter Indicator */}
              {priceFilter !== 'all' && (
                <div className="mt-4 p-3 bg-seloger-red/10 border border-seloger-red/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-seloger-red" />
                    <span className="text-sm font-medium text-foreground">
                      Filtre actif: 
                      {priceFilter === 'high-price' && ' Prix élevés (>600 USD)'}
                      {priceFilter === 'medium-price' && ' Prix moyens (300-600 USD)'}
                      {priceFilter === 'low-price' && ' Prix bas (<300 USD)'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seules les provinces correspondant à ce critère sont affichées sur la carte
                  </p>
                </div>
              )}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">République Démocratique du Congo</h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        Cliquez sur une province pour afficher ses indicateurs détaillés
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        Mode: {transactionType === 'location' ? 'Location' : 'Vente'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {filteredProvinces.length} provinces affichées
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 h-96 lg:h-[500px]">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-seloger-red" />
                  <h4 className="font-semibold text-sm text-foreground">Prix & Valeur</h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Prix moyen location/m²</li>
                  <li>• Prix moyen vente/m²</li>
                  <li>• Valeur foncière parcelle</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-seloger-red" />
                  <h4 className="font-semibold text-sm text-foreground">Performance Locative</h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Taux d'occupation</li>
                  <li>• Durée de mise en location</li>
                  <li>• Indice de pression locative</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-seloger-red" />
                  <h4 className="font-semibold text-sm text-foreground">Activité du Marché</h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Volume d'annonces</li>
                  <li>• Nombre de transactions</li>
                  <li>• Population locative</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-seloger-red" />
                  <h4 className="font-semibold text-sm text-foreground">Données Économiques</h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Recettes locatives</li>
                  <li>• Recettes fiscales</li>
                  <li>• Évolution sur 3 mois</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">🏢 À propos de BIC Analytic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <strong>BIC Analytic</strong> propose une cartographie immobilière complète de la République Démocratique du Congo. 
              Notre plateforme combine données publiques, analyses de marché et modélisations territoriales pour offrir 
              une vision claire du secteur immobilier congolais.
            </p>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-seloger-red">15+</div>
                <div className="text-sm text-muted-foreground">Indicateurs analysés</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-seloger-red">26</div>
                <div className="text-sm text-muted-foreground">Provinces couvertes</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-seloger-red">100k+</div>
                <div className="text-sm text-muted-foreground">Points de données</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;