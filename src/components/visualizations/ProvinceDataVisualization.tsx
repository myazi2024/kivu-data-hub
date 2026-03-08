import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DollarSign,
  Info,
  Users,
  Building,
  Landmark
} from 'lucide-react';
import { ProvinceData } from '@/types/province';
import { VacancyRateVisualization } from './VacancyRateVisualization';
import { PriceEvolutionVisualization } from './PriceEvolutionVisualization';
import { TransactionVolumeVisualization } from './TransactionVolumeVisualization';
import { RentalYieldVisualization } from './RentalYieldVisualization';
import { PropertyTypeVisualization } from './PropertyTypeVisualization';
import { LandPressureVisualization } from './LandPressureVisualization';
import { FiscalRevenueVisualization } from './FiscalRevenueVisualization';
import { OwnershipRateVisualization } from './OwnershipRateVisualization';
import { HousingAccessVisualization } from './HousingAccessVisualization';
import { LandValueVisualization } from './LandValueVisualization';

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
    },
    {
      id: 'fiscal-revenue',
      name: 'Recettes fiscales',
      icon: DollarSign,
      description: 'Comparaison des recettes fiscales et locatives par province'
    },
    {
      id: 'ownership-rate',
      name: 'Taux de propriété',
      icon: Users,
      description: 'Répartition propriétaires vs locataires par province'
    },
    {
      id: 'housing-access',
      name: 'Accessibilité logement',
      icon: Building,
      description: 'Indice d\'accessibilité au logement et croissance des prix'
    },
    {
      id: 'land-value',
      name: 'Valeur foncière',
      icon: Landmark,
      description: 'Valeur foncière moyenne des parcelles et prix au m² par province'
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
      case 'fiscal-revenue':
        return <FiscalRevenueVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'ownership-rate':
        return <OwnershipRateVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'housing-access':
        return <HousingAccessVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      case 'land-value':
        return <LandValueVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
      default:
        return <VacancyRateVisualization provinces={filteredProvinces} selectedProvince={selectedProvince} />;
    }
  };

  return (
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <div className="space-y-3 sm:space-y-4">
      <Card className="border-0 shadow-none bg-background/50">
        
        <CardContent className="px-0">

          {/* Sélecteur d'indicateurs - Responsive */}
          <Tabs value={activeIndicator} onValueChange={setActiveIndicator} className="w-full">
            <div className="flex justify-center">
              <TabsList className="inline-flex items-center gap-0.5 h-auto p-1 bg-background border border-border/50 rounded-xl shadow-sm">
                {indicators.map((indicator) => (
                  <Tooltip key={indicator.id}>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value={indicator.id}
                        className="flex flex-col items-center gap-1.5 p-2.5 min-w-[56px] h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 transition-all duration-200 rounded-lg border border-transparent data-[state=active]:border-primary/20 data-[state=active]:shadow-sm group"
                      >
                        <indicator.icon className="h-5 w-5 transition-transform duration-200 data-[state=active]:scale-110" />
                        <span className="text-[10px] font-medium leading-none text-center whitespace-normal break-words max-w-[48px] opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-200 absolute top-12 bg-popover text-popover-foreground px-2 py-1 rounded-md border shadow-md z-50">
                          {indicator.name}
                        </span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-popover border border-border/50 shadow-md z-50">
                      <p className="text-sm font-medium">{indicator.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{indicator.description}</p>
                    </TooltipContent>
                  </Tooltip>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="ml-auto inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground focus:outline-none" aria-label="Aide">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs">{indicator.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </h3>
                    <p className="responsive-caption text-muted-foreground mt-1 hidden md:block">
                      {indicator.description}
                    </p>
                  </div>
                  
                   <div className="bg-card rounded border-border/30 border relative">
                     {/* Filtre période dans le coin - seulement pour les graphiques temporels */}
                     {(indicator.id === 'price-evolution' || indicator.id === 'transaction-volume') && (
                       <div className="absolute top-2 right-2 z-20">
                         <Select value={periodFilter} onValueChange={setPeriodFilter}>
                           <SelectTrigger className="h-7 text-xs min-w-[90px] bg-background/80 backdrop-blur-sm border-border/50">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="z-50 bg-popover">
                             <SelectItem value="current" className="text-xs">Actuelle</SelectItem>
                             <SelectItem value="quarterly" className="text-xs">Trimestrielle</SelectItem>
                             <SelectItem value="annual" className="text-xs">Annuelle</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     )}
                     <ScrollArea className="h-96 w-full">
                       <div className="w-full overflow-visible p-4">
                         <div className="w-full">
                           {renderVisualization()}
                         </div>
                       </div>
                     </ScrollArea>
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
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    ${(filteredProvinces.reduce((sum, p) => sum + p.recettesFiscalesUsd, 0) / 1000).toFixed(0)}k
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Fiscal</div>
                </div>
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    {Math.round(filteredProvinces.reduce((sum, p) => sum + (p.tauxPropriete || 0), 0) / filteredProvinces.length)}%
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Propriété</div>
                </div>
                <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    ${(filteredProvinces.reduce((sum, p) => sum + p.valeurFonciereParcelleUsd, 0) / filteredProvinces.length / 1000).toFixed(1)}k
                  </div>
                  <div className="responsive-caption text-muted-foreground leading-tight">Val. moy.</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default ProvinceDataVisualization;