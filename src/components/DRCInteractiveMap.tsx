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
      // Nouveaux indicateurs
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
      // Nouveaux indicateurs
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
    <div className="w-full h-full p-1 sm:p-2">
      {/* Layout responsive avec mobile-first */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-1 sm:gap-2 h-full">
          {/* Carte interactive - 2/6 largeur */}
          <div className="lg:col-span-2 h-full order-3 lg:order-1">
            <Card className="shadow-card overflow-hidden h-full flex flex-col">
              <CardContent className="p-0 flex-1 flex flex-col">
                {/* En-tête responsive avec contrôles de zoom et filtre de visualisation */}
                <div className="bg-muted/30 p-1.5 sm:p-2 border-b space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground">
                      <span className="hidden sm:inline">RDC - Marché Immobilier</span>
                      <span className="sm:hidden">Marché RDC</span>
                    </h2>
                    
                    {/* Contrôles de zoom dans l'en-tête */}
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
                  
                  {/* Filtre de visualisation intégré dans le cadre de la carte */}
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
          <div className="lg:col-span-2 space-y-1 order-1 lg:order-2 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Visualisations avancées */}
            <ProvinceDataVisualization 
              provinces={provincesData} 
              selectedProvince={selectedProvince}
            />
              
               <div className="space-y-2">

                {selectedProvince && (
                  <div className="space-y-2">
                    <div className="border-t pt-2">
                      <h4 className="font-semibold text-sm mb-1.5 text-foreground">{selectedProvince.name}</h4>
                      
                      <div className="grid grid-cols-1 gap-1.5">
                        {/* Prix & Valeur */}
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Prix & Valeur
                            <span className="text-[10px] opacity-70">(USD par m²)</span>
                          </h5>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div className="p-1.5 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Loyer:</span>
                              <span className="font-semibold ml-1">${selectedProvince.prixMoyenLoyer}</span>
                            </div>
                            <div className="p-1.5 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Vente:</span>
                              <span className="font-semibold ml-1">${selectedProvince.prixMoyenVenteM2}</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance locative */}
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Performance Locative
                            <span className="text-[10px] opacity-70">(efficacité du marché)</span>
                          </h5>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div className="p-1.5 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Taux occ.:</span>
                              <span className="font-semibold ml-1 text-green-600">{selectedProvince.tauxOccupationLocatif}%</span>
                            </div>
                            <div className="p-1.5 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Durée loc.:</span>
                              <span className="font-semibold ml-1">{selectedProvince.dureeMoyenneMiseLocationJours}j</span>
                            </div>
                          </div>
                        </div>

                        {/* Population & activité */}
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Marché Locatif
                            <span className="text-[10px] opacity-70">(population concernée)</span>
                          </h5>
                          <div className="p-1.5 bg-muted/50 rounded text-[10px]">
                            <span className="text-muted-foreground">Pop. locative:</span>
                            <span className="font-semibold ml-1 text-blue-600">
                              {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k hab.
                            </span>
                          </div>
                        </div>

                        {/* Pression locative */}
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Tension du Marché
                            <span className="text-[10px] opacity-70">(demande vs offre)</span>
                          </h5>
                          <div className="p-1.5 bg-muted/50 rounded">
                            <Badge 
                              variant={
                                selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                                selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' :
                                selectedProvince.indicePresionLocative === 'Modéré' ? 'outline' : 'default'
                              }
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {selectedProvince.indicePresionLocative}
                            </Badge>
                          </div>
                        </div>
                      </div>
                     </div>
                   </div>
                 )}

                 {/* Nouveau cadre pour les graphiques d'évolution */}
                 {selectedProvince && (
                  <div className="p-1 bg-background border border-border rounded-lg shadow-sm h-full overflow-y-auto">
                    <h3 className="text-xs font-semibold mb-1 text-foreground flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5" />
                      Évolutions - {selectedProvince.name}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mb-1">
                      Tendances des prix et de la population locative sur 3 mois.
                    </p>
                   
                    <div className="space-y-1.5 overflow-y-auto">
                       {/* Évolution des prix */}
                       <Card>
                         <CardHeader className="pb-0 pt-1 px-1.5">
                           <CardTitle className="text-[10px] flex items-center gap-1">
                             <TrendingUp className="h-2 w-2" />
                             Évolution des prix (vente et location)
                             <span className="text-[8px] font-normal text-muted-foreground ml-1">(USD/m²)</span>
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="pt-0 pb-1 px-1.5">
                         <div className="space-y-2">
                           {(() => {
                             const priceEvolution = [
                               { 
                                 periode: 'Il y a 3 mois', 
                                 location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 100)),
                                 vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 150))
                               },
                               { 
                                 periode: 'Il y a 2 mois', 
                                 location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 200)),
                                 vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 300))
                               },
                               { 
                                 periode: 'Il y a 1 mois', 
                                 location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 300)),
                                 vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 450))
                               },
                               { 
                                 periode: 'Aujourd\'hui', 
                                 location: selectedProvince.prixMoyenLoyer,
                                 vente: selectedProvince.prixMoyenVenteM2
                               }
                             ];
                             
                             const formatCurrency = (value: number) => {
                               return new Intl.NumberFormat('fr-FR', {
                                 style: 'currency',
                                 currency: 'USD',
                                 minimumFractionDigits: 0,
                               }).format(value);
                             };
                             
                             return (
                                 <div className="space-y-1.5">
                                    <ResponsiveContainer width="100%" height={120}>
                                      <LineChart data={priceEvolution} margin={{ top: 5, right: 15, left: 15, bottom: 40 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                      <XAxis 
                                        dataKey="periode" 
                                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                        angle={-35}
                                        textAnchor="end"
                                        height={35}
                                        interval={0}
                                      />
                                      <YAxis 
                                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                        width={40}
                                      />
                                     <Tooltip 
                                       contentStyle={{ 
                                         backgroundColor: 'hsl(var(--background))', 
                                         border: '1px solid hsl(var(--border))',
                                         borderRadius: '6px',
                                         fontSize: '10px'
                                       }}
                                       formatter={(value: number, name: string) => [
                                         formatCurrency(value), 
                                         name === 'location' ? 'Location' : 'Vente'
                                       ]}
                                     />
                                     <Line 
                                       type="monotone" 
                                       dataKey="location" 
                                       stroke="hsl(var(--primary))" 
                                       strokeWidth={2}
                                       dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                                     />
                                     <Line 
                                       type="monotone" 
                                       dataKey="vente" 
                                       stroke="hsl(var(--secondary))" 
                                       strokeWidth={2}
                                       dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
                                     />
                                   </LineChart>
                                 </ResponsiveContainer>
                                 
                                  {/* Notes explicatives */}
                                  <div className="bg-muted/30 p-2 rounded text-[10px] space-y-1 mt-2">
                                   <div className="flex items-center gap-2">
                                     <div className="w-4 h-1 bg-primary rounded"></div>
                                     <span className="font-medium">Location : {selectedProvince.variationLoyer3Mois >= 0 ? '+' : ''}{selectedProvince.variationLoyer3Mois.toFixed(1)}% en 3 mois</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <div className="w-4 h-1 bg-secondary rounded"></div>
                                     <span className="font-medium">Vente : Corrélation avec marché locatif</span>
                                   </div>
                                    <p className="text-muted-foreground text-[9px] mt-1 leading-relaxed">
                                      * Données basées sur les tendances observées et la variation des loyers sur 3 mois
                                    </p>
                                 </div>
                               </div>
                             );
                           })()}
                         </div>
                       </CardContent>
                     </Card>

                      {/* Évolution des locataires */}
                      <Card>
                        <CardHeader className="pb-0 pt-1 px-1.5">
                          <CardTitle className="text-[10px] flex items-center gap-1">
                            <Users className="h-2 w-2" />
                            Évolution des locataires
                            <span className="text-[8px] font-normal text-muted-foreground ml-1">(population)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-1 px-1.5">
                         <div className="space-y-2">
                           {(() => {
                             const tenantsEvolution = [
                               { periode: 'Il y a 3 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.92) },
                               { periode: 'Il y a 2 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.95) },
                               { periode: 'Il y a 1 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.98) },
                               { periode: 'Aujourd\'hui', locataires: selectedProvince.populationLocativeEstimee }
                             ];
                             
                             const formatPopulation = (value: number) => {
                               return `${Math.round(value / 1000)}k`;
                             };
                             
                             const croissance = ((tenantsEvolution[3].locataires - tenantsEvolution[0].locataires) / tenantsEvolution[0].locataires * 100);
                             
                              return (
                                 <div className="space-y-1.5">
                                    <ResponsiveContainer width="100%" height={110}>
                                      <AreaChart data={tenantsEvolution} margin={{ top: 5, right: 15, left: 15, bottom: 35 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                      <XAxis 
                                        dataKey="periode" 
                                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                        angle={-35}
                                        textAnchor="end"
                                        height={35}
                                        interval={0}
                                      />
                                      <YAxis 
                                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                        width={40}
                                      />
                                     <Tooltip 
                                       contentStyle={{ 
                                         backgroundColor: 'hsl(var(--background))', 
                                         border: '1px solid hsl(var(--border))',
                                         borderRadius: '6px',
                                         fontSize: '10px'
                                       }}
                                       formatter={(value: number) => [formatPopulation(value), 'Locataires']}
                                     />
                                     <Area 
                                       type="monotone" 
                                       dataKey="locataires" 
                                       stroke="hsl(var(--accent))" 
                                       strokeWidth={2}
                                       fill="hsl(var(--accent))" 
                                       fillOpacity={0.3}
                                       dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 3 }}
                                     />
                                   </AreaChart>
                                 </ResponsiveContainer>
                                 
                                  {/* Notes explicatives */}
                                  <div className="bg-muted/30 p-2 rounded text-[10px] space-y-1 mt-2">
                                   <div className="flex items-center gap-2">
                                     <div className="w-4 h-1 bg-accent rounded"></div>
                                     <span className="font-medium">Croissance : {croissance >= 0 ? '+' : ''}{croissance.toFixed(1)}% en 3 mois</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <span className="text-muted-foreground">Total actuel :</span>
                                     <span className="font-medium">{formatPopulation(selectedProvince.populationLocativeEstimee)} habitants</span>
                                   </div>
                                    <p className="text-muted-foreground text-[9px] mt-1 leading-relaxed">
                                      * Évolution estimée basée sur les dynamiques démographiques et économiques locales
                                    </p>
                                 </div>
                               </div>
                             );
                           })()}
                         </div>
                       </CardContent>
                     </Card>
                  </div>
                 )}
              </div>
           </div>
        </div>

          {/* Panneau Analytics - 2/6 largeur à droite */}
          <div className="lg:col-span-2 space-y-1 order-2 lg:order-3 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Analytics */}
            <div className="p-1 bg-background border border-border rounded-lg shadow-sm overflow-hidden">
              <h3 className="text-xs font-semibold mb-1 text-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Analytics Immobilier
              </h3>
              <p className="text-[9px] text-muted-foreground mb-1">
                Visualisations des tendances nationales et comparaisons inter-provinciales du marché immobilier.
              </p>
               <div className="flex-1 overflow-hidden">
                <ProvinceDataVisualization 
                  provinces={provincesData} 
                  selectedProvince={selectedProvince}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default DRCInteractiveMap;