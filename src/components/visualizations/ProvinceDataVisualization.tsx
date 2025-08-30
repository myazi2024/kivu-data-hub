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
    <div className="space-y-3">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2 px-0 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Indicateurs du Marché
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Données provinciales RDC
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportPNG}
                className="text-xs h-7 px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportPDF}
                className="text-xs h-7 px-2"
              >
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-0">
          {/* Contrôles de filtrage - Version compacte avec scroll horizontal */}
          <div className="mb-3 p-2 bg-muted/20 rounded-lg border">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <div className="flex gap-3 min-w-max pb-1">
                <div className="flex-shrink-0 space-y-1 min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Zone</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="urban">Urbaines</SelectItem>
                      <SelectItem value="rural">Rurales</SelectItem>
                      <SelectItem value="high-pressure">Forte pression</SelectItem>
                      <SelectItem value="residential">Résidentiel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-shrink-0 space-y-1 min-w-[120px]">
                  <label className="text-xs font-medium text-muted-foreground">Période</label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Actuelle</SelectItem>
                      <SelectItem value="quarterly">Trimestrielle</SelectItem>
                      <SelectItem value="annual">Annuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-shrink-0 space-y-1 min-w-[100px]">
                  <label className="text-xs font-medium text-muted-foreground">Focus</label>
                  <div className="flex items-center h-7">
                    {selectedProvince ? (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {selectedProvince.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Aucune
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sélecteur d'indicateurs - Version compacte avec scroll */}
          <Tabs value={activeIndicator} onValueChange={setActiveIndicator} className="w-full">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <TabsList className="grid grid-cols-6 min-w-max w-full h-auto p-1">
                {indicators.map((indicator) => (
                  <TabsTrigger
                    key={indicator.id}
                    value={indicator.id}
                    className="flex flex-col items-center gap-0.5 p-2 text-xs min-w-[80px] h-auto data-[state=active]:bg-primary/10"
                  >
                    <indicator.icon className="h-3 w-3" />
                    <span className="text-[10px] leading-tight text-center">
                      {indicator.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Contenu des visualisations avec scroll optimisé */}
            {indicators.map((indicator) => (
              <TabsContent key={indicator.id} value={indicator.id} className="mt-3">
                <div className="space-y-2">
                  <div className="bg-primary/5 p-2 rounded border-l-2 border-primary">
                    <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                      <indicator.icon className="h-3 w-3 text-primary" />
                      {indicator.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {indicator.description}
                    </p>
                  </div>
                  
                  <div className="bg-card rounded border">
                    <div className="max-h-[350px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                      <div className="p-3">
                        {renderVisualization()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Statistiques agrégées - Version compacte avec scroll horizontal */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <div className="flex gap-2 min-w-max pb-1">
                <div className="flex-shrink-0 text-center p-2 bg-primary/5 rounded border min-w-[90px]">
                  <div className="text-base font-semibold text-foreground">
                    {filteredProvinces.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Provinces</div>
                </div>
                <div className="flex-shrink-0 text-center p-2 bg-primary/5 rounded border min-w-[90px]">
                  <div className="text-base font-semibold text-foreground">
                    ${Math.round(filteredProvinces.reduce((sum, p) => sum + p.prixMoyenLoyer, 0) / filteredProvinces.length)}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Loyer/m²</div>
                </div>
                <div className="flex-shrink-0 text-center p-2 bg-primary/5 rounded border min-w-[90px]">
                  <div className="text-base font-semibold text-foreground">
                    {Math.round(filteredProvinces.reduce((sum, p) => sum + p.tauxVacanceLocative, 0) / filteredProvinces.length)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Vacance</div>
                </div>
                <div className="flex-shrink-0 text-center p-2 bg-primary/5 rounded border min-w-[90px]">
                  <div className="text-base font-semibold text-foreground">
                    {(filteredProvinces.reduce((sum, p) => sum + p.populationLocativeEstimee, 0) / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Pop. locative</div>
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