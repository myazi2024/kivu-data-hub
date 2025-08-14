import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, MapPin, Users, DollarSign, Building, Clock, BarChart3, ZoomIn, ZoomOut } from 'lucide-react';
import DRCMapWithTooltip from './DRCMapWithTooltip';
import { ProvinceAnalytics } from './charts/ProvinceAnalytics';
import { useMapEvents } from 'react-leaflet';
import { ProvinceData } from '@/types/province';

// Composant carte interactive RDC - simplifié
const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

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
      id: 'CDKE',
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
      id: 'CDKAO',
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
      id: 'CDLU',
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
      name: 'Kongo-Central',
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
    },
    {
      id: 'CDHU',
      name: 'Haut-Uele',
      prixMoyenLoyer: 110,
      prixMoyenVenteM2: 260,
      valeurFonciereParcelleUsd: 3200,
      tauxOccupationLocatif: 60.5,
      dureeMoyenneMiseLocationJours: 52,
      tauxVacanceLocative: 39.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 580,
      nombreTransactionsEstimees: 380,
      populationLocativeEstimee: 25000,
      recettesLocativesUsd: 82000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.6,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDIT',
      name: 'Ituri',
      prixMoyenLoyer: 130,
      prixMoyenVenteM2: 300,
      valeurFonciereParcelleUsd: 3800,
      tauxOccupationLocatif: 63.2,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 36.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 720,
      nombreTransactionsEstimees: 480,
      populationLocativeEstimee: 32000,
      recettesLocativesUsd: 105000,
      recettesFiscalesUsd: 16000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDTO',
      name: 'Tshopo',
      prixMoyenLoyer: 125,
      prixMoyenVenteM2: 290,
      valeurFonciereParcelleUsd: 3600,
      tauxOccupationLocatif: 62.8,
      dureeMoyenneMiseLocationJours: 46,
      tauxVacanceLocative: 37.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 680,
      nombreTransactionsEstimees: 450,
      populationLocativeEstimee: 30000,
      recettesLocativesUsd: 98000,
      recettesFiscalesUsd: 14000,
      variationLoyer3Mois: 0.7,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDHL',
      name: 'Haut-Lomami',
      prixMoyenLoyer: 135,
      prixMoyenVenteM2: 315,
      valeurFonciereParcelleUsd: 4000,
      tauxOccupationLocatif: 64.5,
      dureeMoyenneMiseLocationJours: 44,
      tauxVacanceLocative: 35.5,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 780,
      nombreTransactionsEstimees: 520,
      populationLocativeEstimee: 35000,
      recettesLocativesUsd: 115000,
      recettesFiscalesUsd: 18000,
      variationLoyer3Mois: 1.0,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDLO',
      name: 'Lomami',
      prixMoyenLoyer: 132,
      prixMoyenVenteM2: 308,
      valeurFonciereParcelleUsd: 3900,
      tauxOccupationLocatif: 63.8,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 36.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 750,
      nombreTransactionsEstimees: 500,
      populationLocativeEstimee: 33000,
      recettesLocativesUsd: 110000,
      recettesFiscalesUsd: 17000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDTA',
      name: 'Tanganyika',
      prixMoyenLoyer: 138,
      prixMoyenVenteM2: 322,
      valeurFonciereParcelleUsd: 4100,
      tauxOccupationLocatif: 65.1,
      dureeMoyenneMiseLocationJours: 43,
      tauxVacanceLocative: 34.9,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 820,
      nombreTransactionsEstimees: 550,
      populationLocativeEstimee: 37000,
      recettesLocativesUsd: 125000,
      recettesFiscalesUsd: 19000,
      variationLoyer3Mois: 1.1,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDSA',
      name: 'Sankuru',
      prixMoyenLoyer: 133,
      prixMoyenVenteM2: 310,
      valeurFonciereParcelleUsd: 3950,
      tauxOccupationLocatif: 64.2,
      dureeMoyenneMiseLocationJours: 44,
      tauxVacanceLocative: 35.8,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 770,
      nombreTransactionsEstimees: 515,
      populationLocativeEstimee: 34000,
      recettesLocativesUsd: 112000,
      recettesFiscalesUsd: 17000,
      variationLoyer3Mois: 1.0,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDMN',
      name: 'Maï-Ndombe',
      prixMoyenLoyer: 115,
      prixMoyenVenteM2: 270,
      valeurFonciereParcelleUsd: 3300,
      tauxOccupationLocatif: 61.2,
      dureeMoyenneMiseLocationJours: 50,
      tauxVacanceLocative: 38.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 620,
      nombreTransactionsEstimees: 410,
      populationLocativeEstimee: 27000,
      recettesLocativesUsd: 88000,
      recettesFiscalesUsd: 13000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDKL',
      name: 'Kwilu',
      prixMoyenLoyer: 128,
      prixMoyenVenteM2: 295,
      valeurFonciereParcelleUsd: 3700,
      tauxOccupationLocatif: 63.5,
      dureeMoyenneMiseLocationJours: 47,
      tauxVacanceLocative: 36.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 700,
      nombreTransactionsEstimees: 470,
      populationLocativeEstimee: 31000,
      recettesLocativesUsd: 102000,
      recettesFiscalesUsd: 15000,
      variationLoyer3Mois: 0.8,
      typologieDominante: 'Maisons individuelles'
    },
    {
      id: 'CDKG',
      name: 'Kwango',
      prixMoyenLoyer: 122,
      prixMoyenVenteM2: 285,
      valeurFonciereParcelleUsd: 3500,
      tauxOccupationLocatif: 62.3,
      dureeMoyenneMiseLocationJours: 48,
      tauxVacanceLocative: 37.7,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 660,
      nombreTransactionsEstimees: 440,
      populationLocativeEstimee: 29000,
      recettesLocativesUsd: 95000,
      recettesFiscalesUsd: 14000,
      variationLoyer3Mois: 0.7,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDEQ',
      name: 'Équateur',
      prixMoyenLoyer: 118,
      prixMoyenVenteM2: 275,
      valeurFonciereParcelleUsd: 3400,
      tauxOccupationLocatif: 61.8,
      dureeMoyenneMiseLocationJours: 49,
      tauxVacanceLocative: 38.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 640,
      nombreTransactionsEstimees: 430,
      populationLocativeEstimee: 28000,
      recettesLocativesUsd: 92000,
      recettesFiscalesUsd: 13000,
      variationLoyer3Mois: 0.6,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDMO',
      name: 'Mongala',
      prixMoyenLoyer: 112,
      prixMoyenVenteM2: 265,
      valeurFonciereParcelleUsd: 3100,
      tauxOccupationLocatif: 60.8,
      dureeMoyenneMiseLocationJours: 51,
      tauxVacanceLocative: 39.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 590,
      nombreTransactionsEstimees: 390,
      populationLocativeEstimee: 26000,
      recettesLocativesUsd: 85000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDNU',
      name: 'Nord-Ubangi',
      prixMoyenLoyer: 108,
      prixMoyenVenteM2: 255,
      valeurFonciereParcelleUsd: 3000,
      tauxOccupationLocatif: 59.5,
      dureeMoyenneMiseLocationJours: 53,
      tauxVacanceLocative: 40.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 550,
      nombreTransactionsEstimees: 370,
      populationLocativeEstimee: 24000,
      recettesLocativesUsd: 78000,
      recettesFiscalesUsd: 11000,
      variationLoyer3Mois: 0.4,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDSU',
      name: 'Sud-Ubangi',
      prixMoyenLoyer: 116,
      prixMoyenVenteM2: 272,
      valeurFonciereParcelleUsd: 3300,
      tauxOccupationLocatif: 61.5,
      dureeMoyenneMiseLocationJours: 50,
      tauxVacanceLocative: 38.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 610,
      nombreTransactionsEstimees: 400,
      populationLocativeEstimee: 27000,
      recettesLocativesUsd: 89000,
      recettesFiscalesUsd: 13000,
      variationLoyer3Mois: 0.6,
      typologieDominante: 'Maisons rurales'
    },
    {
      id: 'CDTU',
      name: 'Tshuapa',
      prixMoyenLoyer: 114,
      prixMoyenVenteM2: 268,
      valeurFonciereParcelleUsd: 3200,
      tauxOccupationLocatif: 61.0,
      dureeMoyenneMiseLocationJours: 51,
      tauxVacanceLocative: 39.0,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 580,
      nombreTransactionsEstimees: 385,
      populationLocativeEstimee: 25000,
      recettesLocativesUsd: 86000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons rurales'
    },
    // Kasaï
    {
      id: 'CDKS',
      name: 'Kasaï',
      prixMoyenLoyer: 130,
      prixMoyenVenteM2: 300,
      valeurFonciereParcelleUsd: 3800,
      tauxOccupationLocatif: 63.2,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 36.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 720,
      nombreTransactionsEstimees: 480,
      populationLocativeEstimee: 32000,
      recettesLocativesUsd: 105000,
      recettesFiscalesUsd: 16000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons individuelles'
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

  // Simple color for provinces
  const getProvinceColor = () => {
    return 'hsl(142, 71%, 45%)'; // emerald
  };

  return (
    <div className="w-full h-full">
      {/* Onglets de sélection intégrés */}
      <div className="bg-muted/30 border-b border-border/20">
        <div className="px-2 sm:px-4 py-0.5">
          <TabsList className="grid w-full max-w-xs sm:max-w-md grid-cols-2 h-7 mx-auto">
            <TabsTrigger value="drc-map" className="text-xs px-2 sm:px-4">
              <span className="hidden sm:inline">Carte RDC</span>
              <span className="sm:hidden">RDC</span>
            </TabsTrigger>
            <TabsTrigger value="territorial-map" className="text-xs px-2 sm:px-4">
              <span className="hidden sm:inline">Cartographie Territoriale</span>
              <span className="sm:hidden">Territorial</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      
      <div className="px-1 sm:px-2 h-full">
        {/* Layout responsive avec mobile-first */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 sm:gap-4 h-full max-h-[75vh]">
          <div className="lg:col-span-3 h-full order-2 lg:order-1">
            <Card className="shadow-card overflow-hidden h-full flex flex-col">
              <CardContent className="p-0 flex-1 flex flex-col">
                {/* En-tête responsive avec contrôles de zoom */}
                <div className="bg-muted/30 p-2 sm:p-3 border-b flex items-center justify-between">
                  <h2 className="text-sm sm:text-lg font-semibold text-foreground">
                    <span className="hidden sm:inline">RDC - Marché Immobilier</span>
                    <span className="sm:hidden">Marché Immobilier RDC</span>
                  </h2>
                  
                  {/* Contrôles de zoom dans l'en-tête */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-8 h-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomIn()}
                      title="Zoom avant"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-8 h-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => mapInstance?.zoomOut()}
                      title="Zoom arrière"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Carte responsive */}
                <div className="flex-1 min-h-0 p-2 sm:p-3 max-h-[65vh] overflow-hidden">
                  <DRCMapWithTooltip
                    provincesData={provincesData}
                    selectedProvince={selectedProvince?.id || null}
                    onProvinceSelect={setSelectedProvince}
                    onProvinceHover={setHoveredProvince}
                    hoveredProvince={hoveredProvince}
                    getProvinceColor={getProvinceColor}
                    onMapReady={setMapInstance}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
            {/* Panneau d'informations responsive */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4 order-1 lg:order-2 max-h-[75vh] overflow-y-auto">
              {/* Message d'instruction sur mobile/tablette */}
              {!selectedProvince && (
              <Card className="shadow-hover lg:hidden">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Touchez une province sur la carte pour voir ses détails
                  </p>
                </CardContent>
              </Card>
            )}
            {selectedProvince ? (
              <Card className="shadow-hover">
                <CardHeader className="bg-gradient-card p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red" />
                    <span className="truncate">{selectedProvince.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[60vh] lg:max-h-none overflow-y-auto lg:overflow-visible">{/* Prix & Valeur */}
                  {/* Prix & Valeur */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-xs sm:text-sm">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-seloger-red" />
                      Prix & Valeur
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Prix vente (m²)</span>
                        <span className="font-semibold text-foreground text-[10px] sm:text-xs">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Prix location (m²)</span>
                        <span className="font-semibold text-foreground text-[10px] sm:text-xs">{formatCurrency(selectedProvince.prixMoyenLoyer)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Valeur foncière</span>
                        <span className="font-semibold text-foreground text-[10px] sm:text-xs">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</span>
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
            
            {/* Graphiques analytiques */}
            <ProvinceAnalytics 
              provincesData={provincesData}
              selectedProvince={selectedProvince}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;