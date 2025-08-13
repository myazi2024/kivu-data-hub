import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import DRCMap from './DRCMap';
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Home,
  DollarSign,
  Building2,
  Minus
} from 'lucide-react';

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

// Données des provinces avec mapping vers les codes simplemaps
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
    id: 'CDKG',
    name: 'Kwango',
    prixMoyenLoyer: 120,
    prixMoyenVenteM2: 280,
    valeurFonciereParcelleUsd: 3500,
    tauxOccupationLocatif: 54.8,
    dureeMoyenneMiseLocationJours: 65,
    tauxVacanceLocative: 45.2,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 950,
    nombreTransactionsEstimees: 680,
    populationLocativeEstimee: 45000,
    recettesLocativesUsd: 97000,
    recettesFiscalesUsd: 18000,
    variationLoyer3Mois: -1.2,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDKL',
    name: 'Kwilu',
    prixMoyenLoyer: 140,
    prixMoyenVenteM2: 320,
    valeurFonciereParcelleUsd: 4200,
    tauxOccupationLocatif: 61.5,
    dureeMoyenneMiseLocationJours: 52,
    tauxVacanceLocative: 38.5,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 1350,
    nombreTransactionsEstimees: 890,
    populationLocativeEstimee: 67000,
    recettesLocativesUsd: 145000,
    recettesFiscalesUsd: 25000,
    variationLoyer3Mois: 0.8,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDMN',
    name: 'Maï-Ndombe',
    prixMoyenLoyer: 110,
    prixMoyenVenteM2: 250,
    valeurFonciereParcelleUsd: 2800,
    tauxOccupationLocatif: 47.7,
    dureeMoyenneMiseLocationJours: 75,
    tauxVacanceLocative: 52.3,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 680,
    nombreTransactionsEstimees: 420,
    populationLocativeEstimee: 34000,
    recettesLocativesUsd: 68000,
    recettesFiscalesUsd: 12000,
    variationLoyer3Mois: -2.1,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDKS',
    name: 'Kasaï',
    prixMoyenLoyer: 160,
    prixMoyenVenteM2: 380,
    valeurFonciereParcelleUsd: 5500,
    tauxOccupationLocatif: 71.3,
    dureeMoyenneMiseLocationJours: 38,
    tauxVacanceLocative: 28.7,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 1850,
    nombreTransactionsEstimees: 1340,
    populationLocativeEstimee: 78000,
    recettesLocativesUsd: 225000,
    recettesFiscalesUsd: 38000,
    variationLoyer3Mois: 1.5,
    typologieDominante: 'Maisons urbaines'
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
  },
  {
    id: 'CDKE',
    name: 'Kasaï-Oriental',
    prixMoyenLoyer: 185,
    prixMoyenVenteM2: 430,
    valeurFonciereParcelleUsd: 6200,
    tauxOccupationLocatif: 75.9,
    dureeMoyenneMiseLocationJours: 32,
    tauxVacanceLocative: 24.1,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 2280,
    nombreTransactionsEstimees: 1580,
    populationLocativeEstimee: 92000,
    recettesLocativesUsd: 305000,
    recettesFiscalesUsd: 48000,
    variationLoyer3Mois: 2.8,
    typologieDominante: 'Maisons urbaines'
  },
  {
    id: 'CDSA',
    name: 'Sankuru',
    prixMoyenLoyer: 130,
    prixMoyenVenteM2: 300,
    valeurFonciereParcelleUsd: 3800,
    tauxOccupationLocatif: 58.8,
    dureeMoyenneMiseLocationJours: 58,
    tauxVacanceLocative: 41.2,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 1120,
    nombreTransactionsEstimees: 720,
    populationLocativeEstimee: 52000,
    recettesLocativesUsd: 118000,
    recettesFiscalesUsd: 21000,
    variationLoyer3Mois: -0.5,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDMA',
    name: 'Maniema',
    prixMoyenLoyer: 145,
    prixMoyenVenteM2: 340,
    valeurFonciereParcelleUsd: 4500,
    tauxOccupationLocatif: 64.2,
    dureeMoyenneMiseLocationJours: 48,
    tauxVacanceLocative: 35.8,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 1250,
    nombreTransactionsEstimees: 810,
    populationLocativeEstimee: 58000,
    recettesLocativesUsd: 152000,
    recettesFiscalesUsd: 27000,
    variationLoyer3Mois: 0.3,
    typologieDominante: 'Habitat rural'
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
    id: 'CDIT',
    name: 'Ituri',
    prixMoyenLoyer: 175,
    prixMoyenVenteM2: 410,
    valeurFonciereParcelleUsd: 6000,
    tauxOccupationLocatif: 70.6,
    dureeMoyenneMiseLocationJours: 42,
    tauxVacanceLocative: 29.4,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 1950,
    nombreTransactionsEstimees: 1290,
    populationLocativeEstimee: 76000,
    recettesLocativesUsd: 240000,
    recettesFiscalesUsd: 39000,
    variationLoyer3Mois: 1.8,
    typologieDominante: 'Maisons urbaines'
  },
  {
    id: 'CDHU',
    name: 'Haut-Uélé',
    prixMoyenLoyer: 125,
    prixMoyenVenteM2: 290,
    valeurFonciereParcelleUsd: 3200,
    tauxOccupationLocatif: 57.2,
    dureeMoyenneMiseLocationJours: 68,
    tauxVacanceLocative: 42.8,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 850,
    nombreTransactionsEstimees: 560,
    populationLocativeEstimee: 38000,
    recettesLocativesUsd: 85000,
    recettesFiscalesUsd: 15000,
    variationLoyer3Mois: -1.8,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDBU',
    name: 'Bas-Uélé',
    prixMoyenLoyer: 115,
    prixMoyenVenteM2: 270,
    valeurFonciereParcelleUsd: 2900,
    tauxOccupationLocatif: 53.9,
    dureeMoyenneMiseLocationJours: 72,
    tauxVacanceLocative: 46.1,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 720,
    nombreTransactionsEstimees: 480,
    populationLocativeEstimee: 32000,
    recettesLocativesUsd: 66000,
    recettesFiscalesUsd: 12000,
    variationLoyer3Mois: -2.3,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDTO',
    name: 'Tshopo',
    prixMoyenLoyer: 155,
    prixMoyenVenteM2: 360,
    valeurFonciereParcelleUsd: 4800,
    tauxOccupationLocatif: 66.8,
    dureeMoyenneMiseLocationJours: 45,
    tauxVacanceLocative: 33.2,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 1450,
    nombreTransactionsEstimees: 950,
    populationLocativeEstimee: 68000,
    recettesLocativesUsd: 185000,
    recettesFiscalesUsd: 32000,
    variationLoyer3Mois: 0.9,
    typologieDominante: 'Maisons urbaines'
  },
  {
    id: 'CDMO',
    name: 'Mongala',
    prixMoyenLoyer: 135,
    prixMoyenVenteM2: 310,
    valeurFonciereParcelleUsd: 3900,
    tauxOccupationLocatif: 60.3,
    dureeMoyenneMiseLocationJours: 55,
    tauxVacanceLocative: 39.7,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 980,
    nombreTransactionsEstimees: 630,
    populationLocativeEstimee: 45000,
    recettesLocativesUsd: 109000,
    recettesFiscalesUsd: 19000,
    variationLoyer3Mois: -0.8,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDNU',
    name: 'Nord-Ubangi',
    prixMoyenLoyer: 105,
    prixMoyenVenteM2: 240,
    valeurFonciereParcelleUsd: 2500,
    tauxOccupationLocatif: 51.5,
    dureeMoyenneMiseLocationJours: 78,
    tauxVacanceLocative: 48.5,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 580,
    nombreTransactionsEstimees: 380,
    populationLocativeEstimee: 28000,
    recettesLocativesUsd: 53000,
    recettesFiscalesUsd: 9000,
    variationLoyer3Mois: -2.8,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDSU',
    name: 'Sud-Ubangi',
    prixMoyenLoyer: 118,
    prixMoyenVenteM2: 265,
    valeurFonciereParcelleUsd: 3000,
    tauxOccupationLocatif: 55.7,
    dureeMoyenneMiseLocationJours: 62,
    tauxVacanceLocative: 44.3,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 780,
    nombreTransactionsEstimees: 520,
    populationLocativeEstimee: 35000,
    recettesLocativesUsd: 74000,
    recettesFiscalesUsd: 13000,
    variationLoyer3Mois: -1.5,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDEQ',
    name: 'Équateur',
    prixMoyenLoyer: 142,
    prixMoyenVenteM2: 330,
    valeurFonciereParcelleUsd: 4300,
    tauxOccupationLocatif: 63.2,
    dureeMoyenneMiseLocationJours: 50,
    tauxVacanceLocative: 36.8,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 1150,
    nombreTransactionsEstimees: 750,
    populationLocativeEstimee: 54000,
    recettesLocativesUsd: 138000,
    recettesFiscalesUsd: 24000,
    variationLoyer3Mois: 0.2,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDTU',
    name: 'Tshuapa',
    prixMoyenLoyer: 128,
    prixMoyenVenteM2: 295,
    valeurFonciereParcelleUsd: 3600,
    tauxOccupationLocatif: 59.2,
    dureeMoyenneMiseLocationJours: 60,
    tauxVacanceLocative: 40.8,
    indicePresionLocative: 'Faible',
    volumeAnnoncesImmobilieres: 890,
    nombreTransactionsEstimees: 590,
    populationLocativeEstimee: 42000,
    recettesLocativesUsd: 96000,
    recettesFiscalesUsd: 17000,
    variationLoyer3Mois: -1.1,
    typologieDominante: 'Habitat rural'
  },
  {
    id: 'CDLO',
    name: 'Lomami',
    prixMoyenLoyer: 165,
    prixMoyenVenteM2: 385,
    valeurFonciereParcelleUsd: 5700,
    tauxOccupationLocatif: 69.9,
    dureeMoyenneMiseLocationJours: 40,
    tauxVacanceLocative: 30.1,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 1750,
    nombreTransactionsEstimees: 1180,
    populationLocativeEstimee: 71000,
    recettesLocativesUsd: 210000,
    recettesFiscalesUsd: 35000,
    variationLoyer3Mois: 1.2,
    typologieDominante: 'Maisons urbaines'
  },
  {
    id: 'CDHL',
    name: 'Haut-Lomami',
    prixMoyenLoyer: 190,
    prixMoyenVenteM2: 440,
    valeurFonciereParcelleUsd: 6800,
    tauxOccupationLocatif: 74.3,
    dureeMoyenneMiseLocationJours: 36,
    tauxVacanceLocative: 25.7,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 2200,
    nombreTransactionsEstimees: 1520,
    populationLocativeEstimee: 88000,
    recettesLocativesUsd: 300000,
    recettesFiscalesUsd: 48000,
    variationLoyer3Mois: 2.5,
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
    id: 'CDTA',
    name: 'Tanganyika',
    prixMoyenLoyer: 175,
    prixMoyenVenteM2: 400,
    valeurFonciereParcelleUsd: 5900,
    tauxOccupationLocatif: 71.5,
    dureeMoyenneMiseLocationJours: 38,
    tauxVacanceLocative: 28.5,
    indicePresionLocative: 'Modéré',
    volumeAnnoncesImmobilieres: 2050,
    nombreTransactionsEstimees: 1380,
    populationLocativeEstimee: 82000,
    recettesLocativesUsd: 258000,
    recettesFiscalesUsd: 42000,
    variationLoyer3Mois: 2.2,
    typologieDominante: 'Maisons urbaines'
  }
];

const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const handleProvinceSelect = (province: ProvinceData) => {
    setSelectedProvince(province);
  };

  const handleProvinceHover = (provinceId: string | null) => {
    setHoveredProvince(provinceId);
  };

  const getColorByPressure = (pression: string) => {
    switch (pression) {
      case 'Très élevé': return '#dc2626';
      case 'Élevé': return '#ea580c';
      case 'Modéré': return '#ca8a04';
      case 'Faible': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 2) return <TrendingUp className="w-4 h-4 text-success" />;
    if (variation < -2) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Carte SVG */}
      <div className="lg:col-span-2">
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Filtrage géographique interactif
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sélectionnez une <strong>Province</strong> pour explorer les indicateurs immobiliers locaux. 
                Les données affichées sont issues d'analyses périodiques et de modélisations territoriales.
              </p>
            </CardHeader>
          <CardContent>
            <div className="relative bg-gradient-to-b from-sky-100 to-sky-50 rounded-lg p-4">
              {/* Légende */}
              <div className="mb-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Faible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span>Modéré</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span>Élevé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span>Très élevé</span>
                </div>
              </div>
              
              {/* Carte interactive */}
              <DRCMap
                provincesData={provincesData}
                selectedProvince={selectedProvince?.id || null}
                onProvinceSelect={handleProvinceSelect}
                onProvinceHover={handleProvinceHover}
                hoveredProvince={hoveredProvince}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panneau d'information */}
      <div className="space-y-4">
        {selectedProvince ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedProvince.name}</span>
                <Badge 
                  style={{ backgroundColor: getColorByPressure(selectedProvince.indicePresionLocative) }}
                  className="text-white"
                >
                  {selectedProvince.indicePresionLocative}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Activité du marché */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Activité du marché
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Volume d'annonces</span>
                    <p className="font-semibold text-sm">{selectedProvince.volumeAnnoncesImmobilieres.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Transactions estimées</span>
                    <p className="font-semibold text-sm">{selectedProvince.nombreTransactionsEstimees.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Prix & Valeur */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Prix & Valeur
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Prix vente (m²)</span>
                      <p className="font-semibold text-sm">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Prix location (m²)</span>
                      <p className="font-semibold text-sm">{formatCurrency(selectedProvince.prixMoyenLoyer)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Valeur foncière parcelle</span>
                    <p className="font-semibold text-sm">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Performance locative */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Performance locative
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Taux occupation</span>
                      <p className="font-semibold text-sm">{selectedProvince.tauxOccupationLocatif.toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Taux vacance</span>
                      <p className="font-semibold text-sm">{selectedProvince.tauxVacanceLocative.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Durée mise location</span>
                      <p className="font-semibold text-sm">{selectedProvince.dureeMoyenneMiseLocationJours} jours</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Variation 3 mois</span>
                      <div className="flex items-center gap-1">
                        {getVariationIcon(selectedProvince.variationLoyer3Mois)}
                        <p className="font-semibold text-sm">{selectedProvince.variationLoyer3Mois.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Population & Recettes */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Population & Recettes
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Population locative estimée</span>
                    <p className="font-semibold text-sm">{selectedProvince.populationLocativeEstimee.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Recettes locatives</span>
                      <p className="font-semibold text-sm">{formatCurrency(selectedProvince.recettesLocativesUsd)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Recettes fiscales</span>
                      <p className="font-semibold text-sm">{formatCurrency(selectedProvince.recettesFiscalesUsd)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Typologie dominante</span>
                <p className="text-sm font-medium">{selectedProvince.typologieDominante}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Cliquez sur une province pour voir les détails</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Statistiques générales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Statistiques Nationales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Prix moyen national</p>
                <p className="font-semibold">
                  {formatCurrency(provincesData.reduce((acc, p) => acc + p.prixMoyenLoyer, 0) / provincesData.length)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Population totale</p>
                <p className="font-semibold">
                  {(provincesData.reduce((acc, p) => acc + p.populationLocativeEstimee, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;