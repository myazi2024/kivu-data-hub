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

  // Pas de fonctions d'export - l'utilisateur peut faire une capture d'écran

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
    <div className="space-y-3 sm:space-y-4">
      <Card className="border-0 shadow-none bg-background/50">
        
        <CardContent className="px-0">
          {/* Contrôles responsive */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-muted/10 rounded border-border/30 border">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <label className="responsive-caption font-medium text-muted-foreground whitespace-nowrap">Période:</label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="touch-target responsive-caption min-w-[100px] sm:min-w-[120px] flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current" className="responsive-caption">Actuelle</SelectItem>
                  <SelectItem value="quarterly" className="responsive-caption">Trimestrielle</SelectItem>
                  <SelectItem value="annual" className="responsive-caption">Annuelle</SelectItem>
                </SelectContent>
              </Select>
              {selectedProvince && (
                <Badge variant="secondary" className="responsive-caption px-2 py-1 ml-auto">
                  {selectedProvince.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Sélecteur d'indicateurs - Responsive */}
          <Tabs value={activeIndicator} onValueChange={setActiveIndicator} className="w-full">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
              <TabsList className="results-grid-tablet sm:grid-cols-3 lg:grid-cols-6 min-w-max w-full h-auto p-1 sm:p-2 gap-1 sm:gap-2">
                {indicators.map((indicator) => (
                  <TabsTrigger
                    key={indicator.id}
                    value={indicator.id}
                    className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 responsive-caption min-w-[80px] sm:min-w-[100px] h-auto data-[state=active]:bg-primary/10 touch-target"
                  >
                    <indicator.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="responsive-caption leading-tight text-center">
                      {indicator.name.split(' ')[0]}
                      <br className="md:hidden" />
                      <span className="hidden md:inline"> {indicator.name.split(' ').slice(1).join(' ')}</span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Contenu responsive */}
            {indicators.map((indicator) => (
              <TabsContent key={indicator.id} value={indicator.id} className="mt-2 sm:mt-3">
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-primary/5 p-3 sm:p-4 rounded border-l-2 border-primary">
                    <h3 className="font-medium responsive-body text-foreground flex items-center gap-2">
                      <indicator.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="hidden md:inline">{indicator.name}</span>
                      <span className="md:hidden">{indicator.name.split(' ')[0]}</span>
                    </h3>
                    <p className="responsive-caption text-muted-foreground mt-1 hidden md:block">
                      {indicator.description}
                    </p>
                  </div>
                  
                   <div className="bg-card rounded border-border/30 border">
                     <div className="charts-compact transform origin-top-left scale-[0.86] md:scale-100 p-1 sm:p-2">
                       {renderVisualization()}
                     </div>
                   </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Statistiques agrégées - Version responsive */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <div className="flex gap-2 sm:gap-3 min-w-max pb-2">
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    {filteredProvinces.length}
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Provinces</div>
                </div>
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    ${Math.round(filteredProvinces.reduce((sum, p) => sum + p.prixMoyenLoyer, 0) / filteredProvinces.length)}
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">$/m²</div>
                </div>
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    {Math.round(filteredProvinces.reduce((sum, p) => sum + p.tauxVacanceLocative, 0) / filteredProvinces.length)}%
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Vacance</div>
                </div>
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    {(filteredProvinces.reduce((sum, p) => sum + p.populationLocativeEstimee, 0) / 1000000).toFixed(1)}M
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Population</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProvinceDataVisualization;