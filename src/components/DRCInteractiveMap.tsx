import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  tauxVacanceLocative: number;
  populationLocativeEstimee: number;
  variationLoyer3Mois: number;
  indicePresion: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  typologieDominante: string;
  nombreTransactions: number;
}

// Données des provinces avec coordonnées simplifiées pour le SVG
const provincesData: (ProvinceData & { path: string })[] = [
  {
    id: 'kinshasa',
    name: 'Kinshasa',
    prixMoyenLoyer: 380,
    prixMoyenVenteM2: 820,
    tauxVacanceLocative: 19.8,
    populationLocativeEstimee: 425000,
    variationLoyer3Mois: 5.1,
    indicePresion: 'Très élevé',
    typologieDominante: 'Usage mixte',
    nombreTransactions: 8964,
    path: 'M200,350 L240,350 L240,380 L200,380 Z'
  },
  {
    id: 'kongo-central',
    name: 'Kongo Central',
    prixMoyenLoyer: 180,
    prixMoyenVenteM2: 420,
    tauxVacanceLocative: 32.1,
    populationLocativeEstimee: 89000,
    variationLoyer3Mois: 2.3,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons individuelles',
    nombreTransactions: 1250,
    path: 'M160,350 L200,350 L200,380 L160,380 Z'
  },
  {
    id: 'kwango',
    name: 'Kwango',
    prixMoyenLoyer: 120,
    prixMoyenVenteM2: 280,
    tauxVacanceLocative: 45.2,
    populationLocativeEstimee: 45000,
    variationLoyer3Mois: -1.2,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 680,
    path: 'M200,320 L240,320 L240,350 L200,350 Z'
  },
  {
    id: 'kwilu',
    name: 'Kwilu',
    prixMoyenLoyer: 140,
    prixMoyenVenteM2: 320,
    tauxVacanceLocative: 38.5,
    populationLocativeEstimee: 67000,
    variationLoyer3Mois: 0.8,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 890,
    path: 'M240,320 L280,320 L280,350 L240,350 Z'
  },
  {
    id: 'mai-ndombe',
    name: 'Mai-Ndombe',
    prixMoyenLoyer: 110,
    prixMoyenVenteM2: 250,
    tauxVacanceLocative: 52.3,
    populationLocativeEstimee: 34000,
    variationLoyer3Mois: -2.1,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 420,
    path: 'M280,320 L320,320 L320,350 L280,350 Z'
  },
  {
    id: 'kasai',
    name: 'Kasaï',
    prixMoyenLoyer: 160,
    prixMoyenVenteM2: 380,
    tauxVacanceLocative: 28.7,
    populationLocativeEstimee: 78000,
    variationLoyer3Mois: 1.5,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1340,
    path: 'M320,290 L360,290 L360,320 L320,320 Z'
  },
  {
    id: 'kasai-central',
    name: 'Kasaï Central',
    prixMoyenLoyer: 170,
    prixMoyenVenteM2: 390,
    tauxVacanceLocative: 26.4,
    populationLocativeEstimee: 85000,
    variationLoyer3Mois: 2.1,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1450,
    path: 'M360,290 L400,290 L400,320 L360,320 Z'
  },
  {
    id: 'kasai-oriental',
    name: 'Kasaï Oriental',
    prixMoyenLoyer: 185,
    prixMoyenVenteM2: 430,
    tauxVacanceLocative: 24.1,
    populationLocativeEstimee: 92000,
    variationLoyer3Mois: 2.8,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1580,
    path: 'M400,290 L440,290 L440,320 L400,320 Z'
  },
  {
    id: 'sankuru',
    name: 'Sankuru',
    prixMoyenLoyer: 130,
    prixMoyenVenteM2: 300,
    tauxVacanceLocative: 41.2,
    populationLocativeEstimee: 52000,
    variationLoyer3Mois: -0.5,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 720,
    path: 'M320,260 L360,260 L360,290 L320,290 Z'
  },
  {
    id: 'maniema',
    name: 'Maniema',
    prixMoyenLoyer: 145,
    prixMoyenVenteM2: 340,
    tauxVacanceLocative: 35.8,
    populationLocativeEstimee: 58000,
    variationLoyer3Mois: 0.3,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 810,
    path: 'M400,260 L440,260 L440,290 L400,290 Z'
  },
  {
    id: 'sud-kivu',
    name: 'Sud-Kivu',
    prixMoyenLoyer: 200,
    prixMoyenVenteM2: 480,
    tauxVacanceLocative: 21.5,
    populationLocativeEstimee: 125000,
    variationLoyer3Mois: 3.2,
    indicePresion: 'Élevé',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 2150,
    path: 'M440,260 L480,260 L480,290 L440,290 Z'
  },
  {
    id: 'nord-kivu',
    name: 'Nord-Kivu',
    prixMoyenLoyer: 250,
    prixMoyenVenteM2: 580,
    tauxVacanceLocative: 22.3,
    populationLocativeEstimee: 152000,
    variationLoyer3Mois: 3.8,
    indicePresion: 'Élevé',
    typologieDominante: 'Usage mixte',
    nombreTransactions: 4349,
    path: 'M440,230 L480,230 L480,260 L440,260 Z'
  },
  {
    id: 'ituri',
    name: 'Ituri',
    prixMoyenLoyer: 175,
    prixMoyenVenteM2: 410,
    tauxVacanceLocative: 29.4,
    populationLocativeEstimee: 76000,
    variationLoyer3Mois: 1.8,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1290,
    path: 'M400,200 L440,200 L440,230 L400,230 Z'
  },
  {
    id: 'haut-uele',
    name: 'Haut-Uélé',
    prixMoyenLoyer: 125,
    prixMoyenVenteM2: 290,
    tauxVacanceLocative: 42.8,
    populationLocativeEstimee: 38000,
    variationLoyer3Mois: -1.8,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 560,
    path: 'M360,170 L400,170 L400,200 L360,200 Z'
  },
  {
    id: 'bas-uele',
    name: 'Bas-Uélé',
    prixMoyenLoyer: 115,
    prixMoyenVenteM2: 270,
    tauxVacanceLocative: 46.1,
    populationLocativeEstimee: 32000,
    variationLoyer3Mois: -2.3,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 480,
    path: 'M320,170 L360,170 L360,200 L320,200 Z'
  },
  {
    id: 'tshopo',
    name: 'Tshopo',
    prixMoyenLoyer: 155,
    prixMoyenVenteM2: 360,
    tauxVacanceLocative: 33.2,
    populationLocativeEstimee: 68000,
    variationLoyer3Mois: 0.9,
    indicePresion: 'Faible',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 950,
    path: 'M320,200 L360,200 L360,230 L320,230 Z'
  },
  {
    id: 'mongala',
    name: 'Mongala',
    prixMoyenLoyer: 135,
    prixMoyenVenteM2: 310,
    tauxVacanceLocative: 39.7,
    populationLocativeEstimee: 45000,
    variationLoyer3Mois: -0.8,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 630,
    path: 'M280,170 L320,170 L320,200 L280,200 Z'
  },
  {
    id: 'nord-ubangi',
    name: 'Nord-Ubangi',
    prixMoyenLoyer: 105,
    prixMoyenVenteM2: 240,
    tauxVacanceLocative: 48.5,
    populationLocativeEstimee: 28000,
    variationLoyer3Mois: -2.8,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 380,
    path: 'M240,140 L280,140 L280,170 L240,170 Z'
  },
  {
    id: 'sud-ubangi',
    name: 'Sud-Ubangi',
    prixMoyenLoyer: 118,
    prixMoyenVenteM2: 265,
    tauxVacanceLocative: 44.3,
    populationLocativeEstimee: 35000,
    variationLoyer3Mois: -1.5,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 520,
    path: 'M240,170 L280,170 L280,200 L240,200 Z'
  },
  {
    id: 'equateur',
    name: 'Équateur',
    prixMoyenLoyer: 142,
    prixMoyenVenteM2: 330,
    tauxVacanceLocative: 36.8,
    populationLocativeEstimee: 54000,
    variationLoyer3Mois: 0.2,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 750,
    path: 'M240,200 L280,200 L280,230 L240,230 Z'
  },
  {
    id: 'tshuapa',
    name: 'Tshuapa',
    prixMoyenLoyer: 128,
    prixMoyenVenteM2: 295,
    tauxVacanceLocative: 40.8,
    populationLocativeEstimee: 42000,
    variationLoyer3Mois: -1.1,
    indicePresion: 'Faible',
    typologieDominante: 'Habitat rural',
    nombreTransactions: 590,
    path: 'M280,230 L320,230 L320,260 L280,260 Z'
  },
  {
    id: 'lomami',
    name: 'Lomami',
    prixMoyenLoyer: 165,
    prixMoyenVenteM2: 385,
    tauxVacanceLocative: 30.1,
    populationLocativeEstimee: 71000,
    variationLoyer3Mois: 1.2,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1180,
    path: 'M360,260 L400,260 L400,290 L360,290 Z'
  },
  {
    id: 'haut-lomami',
    name: 'Haut-Lomami',
    prixMoyenLoyer: 190,
    prixMoyenVenteM2: 440,
    tauxVacanceLocative: 25.7,
    populationLocativeEstimee: 88000,
    variationLoyer3Mois: 2.5,
    indicePresion: 'Modéré',
    typologieDominante: 'Maisons urbaines',
    nombreTransactions: 1520,
    path: 'M400,320 L440,320 L440,350 L400,350 Z'
  },
  {
    id: 'lualaba',
    name: 'Lualaba',
    prixMoyenLoyer: 220,
    prixMoyenVenteM2: 510,
    tauxVacanceLocative: 18.9,
    populationLocativeEstimee: 105000,
    variationLoyer3Mois: 4.1,
    indicePresion: 'Élevé',
    typologieDominante: 'Usage mixte',
    nombreTransactions: 2480,
    path: 'M360,320 L400,320 L400,350 L360,350 Z'
  },
  {
    id: 'haut-katanga',
    name: 'Haut-Katanga',
    prixMoyenLoyer: 280,
    prixMoyenVenteM2: 650,
    tauxVacanceLocative: 16.2,
    populationLocativeEstimee: 185000,
    variationLoyer3Mois: 4.8,
    indicePresion: 'Très élevé',
    typologieDominante: 'Usage mixte',
    nombreTransactions: 5280,
    path: 'M440,320 L480,320 L480,350 L440,350 Z'
  }
];

const DRCInteractiveMap = () => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

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
              Carte Interactive de la RDC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gradient-to-b from-sky-100 to-sky-50 rounded-lg p-4">
              <svg
                viewBox="0 0 600 500"
                className="w-full h-auto"
                style={{ maxHeight: '600px' }}
              >
                {/* Titre de la carte */}
                <text
                  x="300"
                  y="30"
                  textAnchor="middle"
                  className="fill-primary text-lg font-semibold"
                >
                  République Démocratique du Congo
                </text>
                
                {/* Légende */}
                <g transform="translate(20, 50)">
                  <text x="0" y="0" className="fill-foreground text-sm font-medium">
                    Indice de pression foncière:
                  </text>
                  <rect x="0" y="10" width="15" height="10" fill="#16a34a" />
                  <text x="20" y="18" className="fill-foreground text-xs">Faible</text>
                  <rect x="70" y="10" width="15" height="10" fill="#ca8a04" />
                  <text x="90" y="18" className="fill-foreground text-xs">Modéré</text>
                  <rect x="140" y="10" width="15" height="10" fill="#ea580c" />
                  <text x="160" y="18" className="fill-foreground text-xs">Élevé</text>
                  <rect x="190" y="10" width="15" height="10" fill="#dc2626" />
                  <text x="210" y="18" className="fill-foreground text-xs">Très élevé</text>
                </g>
                
                {/* Provinces */}
                {provincesData.map((province) => (
                  <g key={province.id}>
                    <path
                      d={province.path}
                      fill={hoveredProvince === province.id ? '#3b82f6' : getColorByPressure(province.indicePresion)}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredProvince(province.id)}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => setSelectedProvince(province)}
                    />
                    <text
                      x={parseInt(province.path.split(' ')[1].split(',')[0]) + 20}
                      y={parseInt(province.path.split(' ')[1].split(',')[1]) + 20}
                      className="fill-white text-xs font-medium pointer-events-none"
                      textAnchor="middle"
                    >
                      {province.name.length > 12 ? province.name.substring(0, 12) + '...' : province.name}
                    </text>
                  </g>
                ))}
              </svg>
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
                  style={{ backgroundColor: getColorByPressure(selectedProvince.indicePresion) }}
                  className="text-white"
                >
                  {selectedProvince.indicePresion}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Prix loyer</span>
                  </div>
                  <p className="font-semibold">{formatCurrency(selectedProvince.prixMoyenLoyer)}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Prix m² vente</span>
                  </div>
                  <p className="font-semibold">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Population locative</span>
                  </div>
                  <p className="font-semibold">{selectedProvince.populationLocativeEstimee.toLocaleString()}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Transactions</span>
                  </div>
                  <p className="font-semibold">{selectedProvince.nombreTransactions.toLocaleString()}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">Taux de vacance</span>
                  </div>
                  <p className="font-semibold">{selectedProvince.tauxVacanceLocative.toFixed(1)}%</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getVariationIcon(selectedProvince.variationLoyer3Mois)}
                    <span className="text-sm text-muted-foreground">Variation 3 mois</span>
                  </div>
                  <p className="font-semibold">{selectedProvince.variationLoyer3Mois.toFixed(1)}%</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">Typologie dominante</span>
                  </div>
                  <p className="text-sm">{selectedProvince.typologieDominante}</p>
                </div>
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