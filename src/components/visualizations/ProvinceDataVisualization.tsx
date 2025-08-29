import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Filter,
  FileText,
  Map,
  PieChart as PieChartIcon,
  Activity,
  Home,
  DollarSign
} from 'lucide-react';
import { ProvinceData } from '@/types/province';
import { VacancyRateVisualization } from './VacancyRateVisualization';
import { PriceEvolutionVisualization } from './PriceEvolutionVisualization';
import { TransactionVolumeVisualization } from './TransactionVolumeVisualization';
import { RentalYieldVisualization } from './RentalYieldVisualization';
import { PropertyTypeVisualization } from './PropertyTypeVisualization';
import { LandPressureVisualization } from './LandPressureVisualization';

interface ProvinceDataVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  const [activeIndicator, setActiveIndicator] = useState<string>('vacancy-rate');
  const [filterType, setFilterType] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('current');

  // Filtrer les provinces selon les critères sélectionnés
  const filteredProvinces = provinces.filter(province => {
    if (filterType === 'all') return true;
    if (filterType === 'urban') return province.zone === 'Urbaine';
    if (filterType === 'rural') return province.zone === 'Rurale';
    if (filterType === 'high-pressure') return province.indicePresionFonciere > 1.5;
    if (filterType === 'residential') return province.repartitionTypologique.residential > 60;
    return true;
  });

  const indicators = [
    {
      id: 'vacancy-rate',
      name: 'Taux de vacance locative',
      icon: Home,
      description: 'Pourcentage de biens disponibles par rapport à l\'offre totale'
    },
    {
      id: 'price-evolution',
      name: 'Évolution des prix',
      icon: TrendingUp,
      description: 'Tendances des prix au m² (location et vente)'
    },
    {
      id: 'transaction-volume',
      name: 'Volume des transactions',
      icon: Activity,
      description: 'Nombre d\'unités vendues/louées par période'
    },
    {
      id: 'rental-yield',
      name: 'Rendement locatif',
      icon: DollarSign,
      description: 'Rentabilité brute des investissements immobiliers'
    },
    {
      id: 'property-types',
      name: 'Répartition typologique',
      icon: PieChartIcon,
      description: 'Distribution des types de biens (résidentiel, commercial, mixte)'
    },
    {
      id: 'land-pressure',
      name: 'Pression foncière',
      icon: Map,
      description: 'Indice de tension entre demande et offre foncière'
    }
  ];

  const handleExportPDF = () => {
    // Fonction d'export PDF (à implémenter)
    console.log('Export PDF des données de', selectedProvince?.name || 'toutes les provinces');
  };

  const handleExportPNG = () => {
    // Fonction d'export PNG (à implémenter)
    console.log('Export PNG du graphique actuel');
  };

  const renderVisualization = () => {
    switch (activeIndicator) {
      case 'vacancy-rate':
        return <VacancyRateVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'price-evolution':
        return <PriceEvolutionVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'transaction-volume':
        return <TransactionVolumeVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'rental-yield':
        return <RentalYieldVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'property-types':
        return <PropertyTypeVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'land-pressure':
        return <LandPressureVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      default:
        return <VacancyRateVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Indicateurs Dynamiques du Marché Immobilier
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visualisation interactive des données provinciales RDC
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPNG}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Contrôles de filtrage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Zone géographique</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les provinces</SelectItem>
                  <SelectItem value="urban">Zones urbaines</SelectItem>
                  <SelectItem value="rural">Zones rurales</SelectItem>
                  <SelectItem value="high-pressure">Forte pression foncière</SelectItem>
                  <SelectItem value="residential">À dominante résidentielle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Période d'analyse</label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Données actuelles</SelectItem>
                  <SelectItem value="quarterly">Tendance trimestrielle</SelectItem>
                  <SelectItem value="annual">Évolution annuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Province focus</label>
              <div className="flex items-center gap-2">
                {selectedProvince && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedProvince.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {!selectedProvince && "Cliquez sur la carte"}
                </span>
              </div>
            </div>
          </div>

          {/* Sélecteur d'indicateurs */}
          <Tabs value={activeIndicator} onValueChange={setActiveIndicator} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {indicators.map((indicator) => (
                <TabsTrigger
                  key={indicator.id}
                  value={indicator.id}
                  className="flex flex-col items-center gap-1 p-2 text-xs"
                >
                  <indicator.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{indicator.name}</span>
                  <span className="lg:hidden">
                    {indicator.name.split(' ')[0]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Contenu des visualisations */}
            {indicators.map((indicator) => (
              <TabsContent key={indicator.id} value={indicator.id} className="mt-4">
                <div className="space-y-3">
                  <div className="bg-muted/20 p-3 rounded-lg border-l-4 border-primary">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <indicator.icon className="h-4 w-4 text-primary" />
                      {indicator.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {indicator.description}
                    </p>
                  </div>
                  
                  <div className="min-h-[400px]">
                    {renderVisualization()}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Statistiques agrégées */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-semibold text-foreground">
                  {filteredProvinces.length}
                </div>
                <div className="text-xs text-muted-foreground">Provinces analysées</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-semibold text-foreground">
                  ${Math.round(filteredProvinces.reduce((sum, p) => sum + p.prixMoyenLoyer, 0) / filteredProvinces.length)}
                </div>
                <div className="text-xs text-muted-foreground">Loyer moyen/m²</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-semibold text-foreground">
                  {Math.round(filteredProvinces.reduce((sum, p) => sum + p.tauxVacanceLocative, 0) / filteredProvinces.length)}%
                </div>
                <div className="text-xs text-muted-foreground">Vacance moyenne</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-semibold text-foreground">
                  {(filteredProvinces.reduce((sum, p) => sum + p.populationLocativeEstimee, 0) / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-muted-foreground">Population locative</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProvinceDataVisualization;