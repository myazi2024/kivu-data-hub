import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, MapPin, Users, DollarSign, Building, Clock, BarChart3, Info, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import DRCMapWithTooltip from './DRCMapWithTooltip';
import { ProvinceAnalytics } from './charts/ProvinceAnalytics';

import { useMapEvents } from 'react-leaflet';
import { ProvinceData } from '@/types/province';
import ProvinceDataVisualization from './visualizations/ProvinceDataVisualization';


// Composant carte interactive RDC - simplifié
const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
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
    },
    // Kongo Central
    {
      id: 'CDBC',
      name: 'Kongo Central',
      prixMoyenLoyer: 145,
      prixMoyenVenteM2: 320,
      valeurFonciereParcelleUsd: 5200,
      tauxOccupationLocatif: 68.5,
      dureeMoyenneMiseLocationJours: 42,
      tauxVacanceLocative: 31.5,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 1800,
      nombreTransactionsEstimees: 1200,
      populationLocativeEstimee: 95000,
      recettesLocativesUsd: 285000,
      recettesFiscalesUsd: 42000,
      variationLoyer3Mois: 1.5,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.8,
      tauxCroissancePrixAnnuel: 2.8,
      permisConstruireMois: 28,
      tauxAccessibiliteLogement: 58.3,
      repartitionTypologique: { residential: 72, commercial: 18, mixte: 10 },
      tauxPropriete: 65.2,
      indicePresionFonciere: 1.6,
      region: 'Ouest',
      zone: 'Semi-urbaine'
    },
    // Haut-Katanga
    {
      id: 'CDHK',
      name: 'Haut-Katanga',
      prixMoyenLoyer: 165,
      prixMoyenVenteM2: 385,
      valeurFonciereParcelleUsd: 6200,
      tauxOccupationLocatif: 69.8,
      dureeMoyenneMiseLocationJours: 38,
      tauxVacanceLocative: 30.2,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2400,
      nombreTransactionsEstimees: 1650,
      populationLocativeEstimee: 140000,
      recettesLocativesUsd: 365000,
      recettesFiscalesUsd: 55000,
      variationLoyer3Mois: 1.9,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.95,
      tauxCroissancePrixAnnuel: 3.1,
      permisConstruireMois: 35,
      tauxAccessibiliteLogement: 54.7,
      repartitionTypologique: { residential: 75, commercial: 17, mixte: 8 },
      tauxPropriete: 62.8,
      indicePresionFonciere: 1.8,
      region: 'Sud',
      zone: 'Urbaine'
    },
    // Lualaba
    {
      id: 'CDLU',
      name: 'Lualaba',
      prixMoyenLoyer: 155,
      prixMoyenVenteM2: 365,
      valeurFonciereParcelleUsd: 5800,
      tauxOccupationLocatif: 67.2,
      dureeMoyenneMiseLocationJours: 41,
      tauxVacanceLocative: 32.8,
      indicePresionLocative: 'Modéré',
      volumeAnnoncesImmobilieres: 2100,
      nombreTransactionsEstimees: 1400,
      populationLocativeEstimee: 115000,
      recettesLocativesUsd: 325000,
      recettesFiscalesUsd: 48000,
      variationLoyer3Mois: 1.7,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.75,
      tauxCroissancePrixAnnuel: 2.9,
      permisConstruireMois: 33,
      tauxAccessibiliteLogement: 57.1,
      repartitionTypologique: { residential: 73, commercial: 19, mixte: 8 },
      tauxPropriete: 63.5,
      indicePresionFonciere: 1.7,
      region: 'Sud',
      zone: 'Semi-urbaine'
    },
    // Kasaï-Central
    {
      id: 'CDKC',
      name: 'Kasaï-Central',
      prixMoyenLoyer: 125,
      prixMoyenVenteM2: 285,
      valeurFonciereParcelleUsd: 4500,
      tauxOccupationLocatif: 65.8,
      dureeMoyenneMiseLocationJours: 45,
      tauxVacanceLocative: 34.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1600,
      nombreTransactionsEstimees: 1050,
      populationLocativeEstimee: 85000,
      recettesLocativesUsd: 245000,
      recettesFiscalesUsd: 35000,
      variationLoyer3Mois: 1.3,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.2,
      tauxCroissancePrixAnnuel: 2.5,
      permisConstruireMois: 25,
      tauxAccessibiliteLogement: 62.4,
      repartitionTypologique: { residential: 69, commercial: 21, mixte: 10 },
      tauxPropriete: 68.9,
      indicePresionFonciere: 1.4,
      region: 'Centre',
      zone: 'Semi-urbaine'
    },
    // Kasaï
    {
      id: 'CDKS',
      name: 'Kasaï',
      prixMoyenLoyer: 120,
      prixMoyenVenteM2: 275,
      valeurFonciereParcelleUsd: 4300,
      tauxOccupationLocatif: 64.2,
      dureeMoyenneMiseLocationJours: 46,
      tauxVacanceLocative: 35.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1500,
      nombreTransactionsEstimees: 990,
      populationLocativeEstimee: 88000,
      recettesLocativesUsd: 235000,
      recettesFiscalesUsd: 34000,
      variationLoyer3Mois: 1.1,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.0,
      tauxCroissancePrixAnnuel: 2.4,
      permisConstruireMois: 24,
      tauxAccessibiliteLogement: 63.0,
      repartitionTypologique: { residential: 70, commercial: 20, mixte: 10 },
      tauxPropriete: 69.5,
      indicePresionFonciere: 1.35,
      region: 'Centre',
      zone: 'Semi-urbaine'
    },
    // Kasaï-Oriental
    {
      id: 'CDKE',
      name: 'Kasaï-Oriental',
      prixMoyenLoyer: 135,
      prixMoyenVenteM2: 295,
      valeurFonciereParcelleUsd: 4800,
      tauxOccupationLocatif: 66.5,
      dureeMoyenneMiseLocationJours: 43,
      tauxVacanceLocative: 33.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1750,
      nombreTransactionsEstimees: 1150,
      populationLocativeEstimee: 92000,
      recettesLocativesUsd: 265000,
      recettesFiscalesUsd: 38000,
      variationLoyer3Mois: 1.4,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.35,
      tauxCroissancePrixAnnuel: 2.6,
      permisConstruireMois: 27,
      tauxAccessibiliteLogement: 61.2,
      repartitionTypologique: { residential: 70, commercial: 20, mixte: 10 },
      tauxPropriete: 67.8,
      indicePresionFonciere: 1.45,
      region: 'Centre',
      zone: 'Semi-urbaine'
    },
    // Sankuru
    {
      id: 'CDSA',
      name: 'Sankuru',
      prixMoyenLoyer: 95,
      prixMoyenVenteM2: 220,
      valeurFonciereParcelleUsd: 3200,
      tauxOccupationLocatif: 58.2,
      dureeMoyenneMiseLocationJours: 58,
      tauxVacanceLocative: 41.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 850,
      nombreTransactionsEstimees: 520,
      populationLocativeEstimee: 45000,
      recettesLocativesUsd: 125000,
      recettesFiscalesUsd: 18000,
      variationLoyer3Mois: 0.8,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.8,
      tauxCroissancePrixAnnuel: 1.9,
      permisConstruireMois: 18,
      tauxAccessibiliteLogement: 72.5,
      repartitionTypologique: { residential: 65, commercial: 25, mixte: 10 },
      tauxPropriete: 75.2,
      indicePresionFonciere: 1.1,
      region: 'Centre',
      zone: 'Rurale'
    },
    // Lomami
    {
      id: 'CDLO',
      name: 'Lomami',
      prixMoyenLoyer: 105,
      prixMoyenVenteM2: 245,
      valeurFonciereParcelleUsd: 3600,
      tauxOccupationLocatif: 61.5,
      dureeMoyenneMiseLocationJours: 52,
      tauxVacanceLocative: 38.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1050,
      nombreTransactionsEstimees: 680,
      populationLocativeEstimee: 58000,
      recettesLocativesUsd: 155000,
      recettesFiscalesUsd: 23000,
      variationLoyer3Mois: 1.0,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.95,
      tauxCroissancePrixAnnuel: 2.1,
      permisConstruireMois: 22,
      tauxAccessibiliteLogement: 69.8,
      repartitionTypologique: { residential: 67, commercial: 23, mixte: 10 },
      tauxPropriete: 73.1,
      indicePresionFonciere: 1.25,
      region: 'Centre',
      zone: 'Semi-urbaine'
    },
    // Maniema
    {
      id: 'CDMA',
      name: 'Maniema',
      prixMoyenLoyer: 115,
      prixMoyenVenteM2: 265,
      valeurFonciereParcelleUsd: 4000,
      tauxOccupationLocatif: 63.8,
      dureeMoyenneMiseLocationJours: 48,
      tauxVacanceLocative: 36.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1250,
      nombreTransactionsEstimees: 820,
      populationLocativeEstimee: 72000,
      recettesLocativesUsd: 195000,
      recettesFiscalesUsd: 28000,
      variationLoyer3Mois: 1.2,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.1,
      tauxCroissancePrixAnnuel: 2.3,
      permisConstruireMois: 24,
      tauxAccessibiliteLogement: 66.5,
      repartitionTypologique: { residential: 68, commercial: 22, mixte: 10 },
      tauxPropriete: 71.2,
      indicePresionFonciere: 1.3,
      region: 'Est',
      zone: 'Semi-urbaine'
    },
    // Tshopo
    {
      id: 'CDTO',
      name: 'Tshopo',
      prixMoyenLoyer: 118,
      prixMoyenVenteM2: 275,
      valeurFonciereParcelleUsd: 4100,
      tauxOccupationLocatif: 64.2,
      dureeMoyenneMiseLocationJours: 47,
      tauxVacanceLocative: 35.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1350,
      nombreTransactionsEstimees: 890,
      populationLocativeEstimee: 78000,
      recettesLocativesUsd: 215000,
      recettesFiscalesUsd: 31000,
      variationLoyer3Mois: 1.25,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.15,
      tauxCroissancePrixAnnuel: 2.4,
      permisConstruireMois: 26,
      tauxAccessibiliteLogement: 65.8,
      repartitionTypologique: { residential: 69, commercial: 21, mixte: 10 },
      tauxPropriete: 70.5,
      indicePresionFonciere: 1.32,
      region: 'Nord',
      zone: 'Semi-urbaine'
    },
    // Ituri
    {
      id: 'CDIT',
      name: 'Ituri',
      prixMoyenLoyer: 128,
      prixMoyenVenteM2: 288,
      valeurFonciereParcelleUsd: 4300,
      tauxOccupationLocatif: 65.5,
      dureeMoyenneMiseLocationJours: 44,
      tauxVacanceLocative: 34.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1480,
      nombreTransactionsEstimees: 980,
      populationLocativeEstimee: 86000,
      recettesLocativesUsd: 235000,
      recettesFiscalesUsd: 34000,
      variationLoyer3Mois: 1.35,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.25,
      tauxCroissancePrixAnnuel: 2.5,
      permisConstruireMois: 28,
      tauxAccessibiliteLogement: 64.2,
      repartitionTypologique: { residential: 71, commercial: 20, mixte: 9 },
      tauxPropriete: 69.8,
      indicePresionFonciere: 1.35,
      region: 'Nord-Est',
      zone: 'Semi-urbaine'
    },
    // Haut-Uele
    {
      id: 'CDHU',
      name: 'Haut-Uele',
      prixMoyenLoyer: 88,
      prixMoyenVenteM2: 205,
      valeurFonciereParcelleUsd: 2900,
      tauxOccupationLocatif: 55.8,
      dureeMoyenneMiseLocationJours: 62,
      tauxVacanceLocative: 44.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 720,
      nombreTransactionsEstimees: 450,
      populationLocativeEstimee: 38000,
      recettesLocativesUsd: 105000,
      recettesFiscalesUsd: 15000,
      variationLoyer3Mois: 0.6,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.6,
      tauxCroissancePrixAnnuel: 1.7,
      permisConstruireMois: 16,
      tauxAccessibiliteLogement: 76.3,
      repartitionTypologique: { residential: 63, commercial: 27, mixte: 10 },
      tauxPropriete: 78.5,
      indicePresionFonciere: 1.0,
      region: 'Nord',
      zone: 'Rurale'
    },
    // Bas-Uele
    {
      id: 'CDBU',
      name: 'Bas-Uele',
      prixMoyenLoyer: 92,
      prixMoyenVenteM2: 215,
      valeurFonciereParcelleUsd: 3100,
      tauxOccupationLocatif: 57.2,
      dureeMoyenneMiseLocationJours: 59,
      tauxVacanceLocative: 42.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 780,
      nombreTransactionsEstimees: 485,
      populationLocativeEstimee: 42000,
      recettesLocativesUsd: 115000,
      recettesFiscalesUsd: 17000,
      variationLoyer3Mois: 0.7,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.7,
      tauxCroissancePrixAnnuel: 1.8,
      permisConstruireMois: 17,
      tauxAccessibiliteLogement: 75.1,
      repartitionTypologique: { residential: 64, commercial: 26, mixte: 10 },
      tauxPropriete: 77.8,
      indicePresionFonciere: 1.05,
      region: 'Nord',
      zone: 'Rurale'
    },
    // Mongala
    {
      id: 'CDMO',
      name: 'Mongala',
      prixMoyenLoyer: 82,
      prixMoyenVenteM2: 195,
      valeurFonciereParcelleUsd: 2700,
      tauxOccupationLocatif: 52.5,
      dureeMoyenneMiseLocationJours: 68,
      tauxVacanceLocative: 47.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 620,
      nombreTransactionsEstimees: 385,
      populationLocativeEstimee: 32000,
      recettesLocativesUsd: 85000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.4,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.4,
      tauxCroissancePrixAnnuel: 1.5,
      permisConstruireMois: 14,
      tauxAccessibiliteLogement: 79.2,
      repartitionTypologique: { residential: 61, commercial: 29, mixte: 10 },
      tauxPropriete: 81.4,
      indicePresionFonciere: 0.9,
      region: 'Nord',
      zone: 'Rurale'
    },
    // Sud-Ubangi
    {
      id: 'CDSU',
      name: 'Sud-Ubangi',
      prixMoyenLoyer: 85,
      prixMoyenVenteM2: 198,
      valeurFonciereParcelleUsd: 2800,
      tauxOccupationLocatif: 53.8,
      dureeMoyenneMiseLocationJours: 65,
      tauxVacanceLocative: 46.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 680,
      nombreTransactionsEstimees: 420,
      populationLocativeEstimee: 35000,
      recettesLocativesUsd: 95000,
      recettesFiscalesUsd: 14000,
      variationLoyer3Mois: 0.5,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.45,
      tauxCroissancePrixAnnuel: 1.6,
      permisConstruireMois: 15,
      tauxAccessibiliteLogement: 78.5,
      repartitionTypologique: { residential: 62, commercial: 28, mixte: 10 },
      tauxPropriete: 80.7,
      indicePresionFonciere: 0.95,
      region: 'Nord-Ouest',
      zone: 'Rurale'
    },
    // Nord-Ubangi
    {
      id: 'CDNU',
      name: 'Nord-Ubangi',
      prixMoyenLoyer: 78,
      prixMoyenVenteM2: 185,
      valeurFonciereParcelleUsd: 2500,
      tauxOccupationLocatif: 51.2,
      dureeMoyenneMiseLocationJours: 72,
      tauxVacanceLocative: 48.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 580,
      nombreTransactionsEstimees: 350,
      populationLocativeEstimee: 28000,
      recettesLocativesUsd: 75000,
      recettesFiscalesUsd: 11000,
      variationLoyer3Mois: 0.3,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.2,
      tauxCroissancePrixAnnuel: 1.3,
      permisConstruireMois: 12,
      tauxAccessibiliteLogement: 82.1,
      repartitionTypologique: { residential: 59, commercial: 31, mixte: 10 },
      tauxPropriete: 84.2,
      indicePresionFonciere: 0.85,
      region: 'Nord-Ouest',
      zone: 'Rurale'
    },
    // Tshuapa
    {
      id: 'CDTU',
      name: 'Tshuapa',
      prixMoyenLoyer: 75,
      prixMoyenVenteM2: 178,
      valeurFonciereParcelleUsd: 2300,
      tauxOccupationLocatif: 49.5,
      dureeMoyenneMiseLocationJours: 75,
      tauxVacanceLocative: 50.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 520,
      nombreTransactionsEstimees: 315,
      populationLocativeEstimee: 25000,
      recettesLocativesUsd: 65000,
      recettesFiscalesUsd: 9500,
      variationLoyer3Mois: 0.2,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.0,
      tauxCroissancePrixAnnuel: 1.1,
      permisConstruireMois: 10,
      tauxAccessibiliteLogement: 84.8,
      repartitionTypologique: { residential: 57, commercial: 33, mixte: 10 },
      tauxPropriete: 86.5,
      indicePresionFonciere: 0.8,
      region: 'Centre-Ouest',
      zone: 'Rurale'
    },
    // Mai-Ndombe
    {
      id: 'CDMN',
      name: 'Mai-Ndombe',
      prixMoyenLoyer: 72,
      prixMoyenVenteM2: 168,
      valeurFonciereParcelleUsd: 2100,
      tauxOccupationLocatif: 47.8,
      dureeMoyenneMiseLocationJours: 78,
      tauxVacanceLocative: 52.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 480,
      nombreTransactionsEstimees: 285,
      populationLocativeEstimee: 22000,
      recettesLocativesUsd: 55000,
      recettesFiscalesUsd: 8200,
      variationLoyer3Mois: 0.1,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 2.85,
      tauxCroissancePrixAnnuel: 0.9,
      permisConstruireMois: 8,
      tauxAccessibiliteLogement: 87.5,
      repartitionTypologique: { residential: 55, commercial: 35, mixte: 10 },
      tauxPropriete: 89.2,
      indicePresionFonciere: 0.75,
      region: 'Centre-Ouest',
      zone: 'Rurale'
    },
    // Kwilu
    {
      id: 'CDKL',
      name: 'Kwilu',
      prixMoyenLoyer: 98,
      prixMoyenVenteM2: 235,
      valeurFonciereParcelleUsd: 3400,
      tauxOccupationLocatif: 59.5,
      dureeMoyenneMiseLocationJours: 55,
      tauxVacanceLocative: 40.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 920,
      nombreTransactionsEstimees: 580,
      populationLocativeEstimee: 52000,
      recettesLocativesUsd: 145000,
      recettesFiscalesUsd: 21000,
      variationLoyer3Mois: 0.9,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.85,
      tauxCroissancePrixAnnuel: 2.0,
      permisConstruireMois: 20,
      tauxAccessibiliteLogement: 71.8,
      repartitionTypologique: { residential: 66, commercial: 24, mixte: 10 },
      tauxPropriete: 74.5,
      indicePresionFonciere: 1.15,
      region: 'Sud-Ouest',
      zone: 'Semi-urbaine'
    },
    // Kwango
    {
      id: 'CDKG',
      name: 'Kwango',
      prixMoyenLoyer: 88,
      prixMoyenVenteM2: 208,
      valeurFonciereParcelleUsd: 3000,
      tauxOccupationLocatif: 56.2,
      dureeMoyenneMiseLocationJours: 61,
      tauxVacanceLocative: 43.8,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 750,
      nombreTransactionsEstimees: 465,
      populationLocativeEstimee: 40000,
      recettesLocativesUsd: 108000,
      recettesFiscalesUsd: 16000,
      variationLoyer3Mois: 0.65,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.65,
      tauxCroissancePrixAnnuel: 1.75,
      permisConstruireMois: 18,
      tauxAccessibiliteLogement: 76.8,
      repartitionTypologique: { residential: 63, commercial: 27, mixte: 10 },
      tauxPropriete: 79.1,
      indicePresionFonciere: 1.02,
      region: 'Sud-Ouest',
      zone: 'Rurale'
    },
    // Tanganyika
    {
      id: 'CDTA',
      name: 'Tanganyika',
      prixMoyenLoyer: 108,
      prixMoyenVenteM2: 252,
      valeurFonciereParcelleUsd: 3700,
      tauxOccupationLocatif: 62.1,
      dureeMoyenneMiseLocationJours: 50,
      tauxVacanceLocative: 37.9,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1120,
      nombreTransactionsEstimees: 730,
      populationLocativeEstimee: 68000,
      recettesLocativesUsd: 185000,
      recettesFiscalesUsd: 27000,
      variationLoyer3Mois: 1.1,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.0,
      tauxCroissancePrixAnnuel: 2.2,
      permisConstruireMois: 23,
      tauxAccessibiliteLogement: 68.5,
      repartitionTypologique: { residential: 70, commercial: 21, mixte: 9 },
      tauxPropriete: 72.8,
      indicePresionFonciere: 1.28,
      region: 'Sud-Est',
      zone: 'Semi-urbaine'
    },
    // Haut-Lomami
    {
      id: 'CDHL',
      name: 'Haut-Lomami',
      prixMoyenLoyer: 112,
      prixMoyenVenteM2: 258,
      valeurFonciereParcelleUsd: 3850,
      tauxOccupationLocatif: 63.5,
      dureeMoyenneMiseLocationJours: 48,
      tauxVacanceLocative: 36.5,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 1180,
      nombreTransactionsEstimees: 780,
      populationLocativeEstimee: 75000,
      recettesLocativesUsd: 205000,
      recettesFiscalesUsd: 30000,
      variationLoyer3Mois: 1.15,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 4.05,
      tauxCroissancePrixAnnuel: 2.25,
      permisConstruireMois: 24,
      tauxAccessibiliteLogement: 67.2,
      repartitionTypologique: { residential: 71, commercial: 20, mixte: 9 },
      tauxPropriete: 71.5,
      indicePresionFonciere: 1.3,
      region: 'Sud',
      zone: 'Semi-urbaine'
    },
    // Equateur
    {
      id: 'CDEQ',
      name: 'Équateur',
      prixMoyenLoyer: 80,
      prixMoyenVenteM2: 188,
      valeurFonciereParcelleUsd: 2600,
      tauxOccupationLocatif: 50.8,
      dureeMoyenneMiseLocationJours: 70,
      tauxVacanceLocative: 49.2,
      indicePresionLocative: 'Faible',
      volumeAnnoncesImmobilieres: 620,
      nombreTransactionsEstimees: 380,
      populationLocativeEstimee: 30000,
      recettesLocativesUsd: 80000,
      recettesFiscalesUsd: 12000,
      variationLoyer3Mois: 0.35,
      typologieDominante: 'Maisons individuelles',
      rendementLocatifBrut: 3.25,
      tauxCroissancePrixAnnuel: 1.4,
      permisConstruireMois: 13,
      tauxAccessibiliteLogement: 81.5,
      repartitionTypologique: { residential: 58, commercial: 32, mixte: 10 },
      tauxPropriete: 83.8,
      indicePresionFonciere: 0.88,
      region: 'Nord-Ouest',
      zone: 'Rurale'
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
    <div className="w-full h-full max-w-full overflow-hidden relative">
        {/* Contrôles mobiles flottants - déplacés vers le bas */}
        <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center justify-center gap-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-3 py-2 shadow-lg">
            <Button size="sm" variant={activeMobilePanel==='map' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('map')} aria-label="Carte" className="rounded-full">
              <MapPin className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={activeMobilePanel==='analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('analytics')} aria-label="Analytics" className="rounded-full">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Layout responsive optimisé avec padding pour les boutons flottants */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0 pb-20 lg:pb-0">
        {/* Carte interactive + Données province - Responsive layout */}
        <div className={`${activeMobilePanel !== 'map' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 order-1 lg:order-1 flex-col min-h-0 h-full overflow-hidden`}>
          {/* Partie haute : Carte */}
          <div className="flex-[3] min-h-0">
          <Card className="card-compact overflow-hidden h-full flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* En-tête responsive */}
              <div className="bg-muted/20 p-1 sm:p-2 border-b border-border/30">
                {/* Note explicative en haut - Compacte */}
                <div className="mb-1 p-1 bg-blue-50/50 dark:bg-blue-950/10 rounded border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="text-[10px] text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Usage :</span> Survolez/cliquez les provinces • Utilisez les filtres
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[10px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>RDC</span>
                  </h2>
                </div>
                
              </div>
              
              {/* Carte responsive optimisée */}
              <div className="flex-1 min-h-0 p-2 sm:p-3 md:p-4 overflow-hidden">
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
              
              {/* Note explicative en bas - Compacte et bien visible */}
              <div className="p-1 bg-amber-50/70 dark:bg-amber-950/15 border-t border-amber-200/70 dark:border-amber-800/50 flex-shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">À propos :</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">Données immobilières RDC par province</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-[10px] font-medium text-red-700 dark:text-red-300">Précaution :</span>
                    <span className="text-[10px] text-red-700 dark:text-red-300">Estimations indicatives, données variables selon sources</span>
                  </div>
                </div>
              </div>
            </CardContent>
           </Card>
          </div>

          {/* Partie basse : Données province */}
          <div className="flex-[2] min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent border-t border-border/30">
            {selectedProvince ? (
              <div className="p-2 sm:p-3 space-y-2">
                <Card className="card-compact shadow-none border-border/30">
                  <CardHeader className="pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3">
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{selectedProvince.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-2 sm:p-3">
                    {/* Prix & Valeur */}
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-primary" />
                        Prix & val.
                        <Badge variant="outline" className="text-[9px] px-1 py-0">USD/m²</Badge>
                      </h5>
                      <div className="grid grid-cols-3 gap-1">
                        <Card className="p-1">
                          <div className="text-[10px] text-muted-foreground">Loyer moyen</div>
                          <div className="text-xs font-bold text-primary">${selectedProvince.prixMoyenLoyer}/m²</div>
                        </Card>
                        <Card className="p-1">
                          <div className="text-[10px] text-muted-foreground">Prix vente</div>
                          <div className="text-xs font-bold text-primary">${selectedProvince.prixMoyenVenteM2}/m²</div>
                        </Card>
                        <Card className="p-1 bg-accent/5">
                          <div className="text-[10px] text-muted-foreground">Val. foncière</div>
                          <div className="text-xs font-bold text-accent">{formatCurrency(selectedProvince.valeurFonciereParcelleUsd)}</div>
                        </Card>
                      </div>
                    </div>

                    {/* Performance locative */}
                    <div className="grid grid-cols-4 gap-1">
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Occupation</div>
                        <div className="text-xs font-bold text-green-600">{selectedProvince.tauxOccupationLocatif}%</div>
                      </Card>
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Vacance</div>
                        <div className="text-xs font-bold text-orange-500">{selectedProvince.tauxVacanceLocative}%</div>
                      </Card>
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Rendement</div>
                        <div className="text-xs font-bold text-emerald-600">{selectedProvince.rendementLocatifBrut || 0}%</div>
                      </Card>
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Pression</div>
                        <Badge 
                          variant={
                            selectedProvince.indicePresionLocative === 'Très élevé' ? 'destructive' :
                            selectedProvince.indicePresionLocative === 'Élevé' ? 'secondary' :
                            selectedProvince.indicePresionLocative === 'Modéré' ? 'outline' : 'default'
                          }
                          className="text-[9px] px-1 py-0"
                        >
                          {selectedProvince.indicePresionLocative}
                        </Badge>
                      </Card>
                    </div>

                    {/* Marché */}
                    <div className="grid grid-cols-3 gap-1">
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Pop. locative</div>
                        <div className="text-xs font-bold text-blue-600">{(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k</div>
                      </Card>
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Transactions</div>
                        <div className="text-xs font-bold text-accent">{formatNumber(selectedProvince.nombreTransactionsEstimees)}</div>
                      </Card>
                      <Card className="p-1">
                        <div className="text-[10px] text-muted-foreground">Durée location</div>
                        <div className="text-xs font-bold text-primary">{selectedProvince.dureeMoyenneMiseLocationJours}j</div>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-[10px] text-muted-foreground text-center">Cliquez sur une province pour voir ses données</p>
              </div>
            )}
          </div>
        </div>

        {/* Panneau Analytics - Plus d'espace */}
        <div className={`${activeMobilePanel !== 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 order-2 lg:order-2 flex-col min-h-0 h-full`}>
          <Card className="flex-1 overflow-hidden card-compact shadow-none">
            <CardHeader className="px-2 py-1 sm:px-3 sm:py-2 border-b border-border/20">
              <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden charts-compact text-[10px]">
              <ScrollArea className="h-full">
                <div className="p-1 sm:p-2">
                  <div className="w-full">
                    <ProvinceDataVisualization 
                      provinces={provincesData} 
                      selectedProvince={selectedProvince}
                    />
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DRCInteractiveMap;
