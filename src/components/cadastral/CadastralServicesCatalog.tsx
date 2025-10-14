import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, MapPin, History, DollarSign, Shield, Info, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import { analyzeServiceCompleteness, getStatusLabel, getStatusColor, ServiceCompleteness } from '@/utils/cadastralDataCompleteness';
import ServiceCompletenessDialog from './ServiceCompletenessDialog';
import CadastralContributionDialog from './CadastralContributionDialog';
import { cn } from '@/lib/utils';

const CadastralServicesCatalog: React.FC = () => {
  const { services, loading } = useCadastralServices();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [highlightedService, setHighlightedService] = useState<string | null>(null);
  const [completenessDialogOpen, setCompletenessDialogOpen] = useState(false);
  const [selectedServiceForDialog, setSelectedServiceForDialog] = useState<{
    id: string;
    name: string;
    completeness: ServiceCompleteness;
  } | null>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [contributionTarget, setContributionTarget] = useState<{
    parcelNumber: string;
    targetField: string;
    targetTab: string;
  } | null>(null);
  const navigate = useNavigate();
  const { searchResult } = useCadastralSearch();
  const [serviceAnalysis, setServiceAnalysis] = useState<Record<string, ServiceCompleteness>>({});

  // Analyser la complétude des données quand on a un résultat de recherche
  useEffect(() => {
    if (searchResult) {
      const analysis = analyzeServiceCompleteness(searchResult);
      setServiceAnalysis(analysis);
    }
  }, [searchResult]);

  // Mapper les service_id vers les clés d'analyse
  const getAnalysisKey = (serviceId: string): string => {
    const mapping: Record<string, string> = {
      'informations_generales': 'informations_generales',
      'localisation': 'localisation',
      'historique_propriete': 'historique_propriete',
      'historique_fiscal': 'historique_fiscal',
      'historique_hypothecaire': 'historique_hypothecaire',
      'permis_construire': 'permis_construire',
      'historique_bornage': 'historique_bornage',
    };
    return mapping[serviceId] || serviceId;
  };

  // Fonction pour obtenir l'icône correspondant au service
  const getServiceIcon = (serviceId: string) => {
    if (serviceId.includes('information') || serviceId.includes('general')) {
      return FileText;
    } else if (serviceId.includes('location') || serviceId.includes('boundary')) {
      return MapPin;
    } else if (serviceId.includes('history') || serviceId.includes('ownership')) {
      return History;
    } else if (serviceId.includes('obligation') || serviceId.includes('tax')) {
      return Shield;
    }
    return Info;
  };

  const handleServiceToggle = (serviceId: string) => {
    const analysisKey = getAnalysisKey(serviceId);
    const completeness = serviceAnalysis[analysisKey];

    // Si les données sont vides, empêcher la sélection
    if (completeness && completeness.status === 'empty') {
      setHighlightedService(serviceId);
      setTimeout(() => setHighlightedService(null), 2000);
      return;
    }

    // Si les données sont partielles, afficher la boîte de dialogue
    if (completeness && completeness.status === 'partial' && !selectedServices.includes(serviceId)) {
      const service = services.find(s => s.service_id === serviceId);
      if (service) {
        setHighlightedService(serviceId);
        setSelectedServiceForDialog({
          id: serviceId,
          name: service.name,
          completeness,
        });
        setCompletenessDialogOpen(true);
        return;
      }
    }

    // Sélection/désélection normale
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    setHighlightedService(null);
  };

  const handleContribute = (missingField: string) => {
    if (!searchResult || !selectedServiceForDialog) return;

    // Déterminer l'onglet du formulaire CCC à ouvrir
    const analysisKey = getAnalysisKey(selectedServiceForDialog.id);
    let targetTab = 'general';
    
    switch (analysisKey) {
      case 'informations_generales':
        targetTab = 'general';
        break;
      case 'localisation':
        targetTab = 'location';
        break;
      case 'historique_propriete':
        targetTab = 'ownership';
        break;
      case 'historique_fiscal':
      case 'historique_hypothecaire':
        targetTab = 'obligations';
        break;
      case 'permis_construire':
        targetTab = 'permits';
        break;
      case 'historique_bornage':
        targetTab = 'location';
        break;
    }

    setContributionTarget({
      parcelNumber: searchResult.parcel.parcel_number,
      targetField: missingField,
      targetTab,
    });
    setContributionDialogOpen(true);
  };

  const handleProceedWithPartialData = () => {
    if (selectedServiceForDialog) {
      setSelectedServices(prev => [...prev, selectedServiceForDialog.id]);
      setHighlightedService(null);
    }
  };

  const totalPrice = services
    .filter(service => selectedServices.includes(service.service_id))
    .reduce((sum, service) => sum + service.price_usd, 0);

  const handleProceedToSearch = () => {
    if (selectedServices.length === 0) {
      return;
    }
    navigate('/myazi', { state: { preselectedServices: selectedServices } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Services Cadastraux
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
          Accédez aux informations cadastrales officielles pour vos projets immobiliers, 
          juridiques ou de développement territorial.
        </p>
      </div>

      {/* Informations importantes */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base mb-2">Comment ça marche ?</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <li>Sélectionnez les services dont vous avez besoin</li>
                <li>Consultez le prix total avant de procéder</li>
                <li>Effectuez votre recherche cadastrale sur la plateforme Myazi</li>
                <li>Payez et accédez instantanément aux informations</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille des services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const IconComponent = getServiceIcon(service.service_id);
          const analysisKey = getAnalysisKey(service.service_id);
          const completeness = serviceAnalysis[analysisKey];
          const isHighlighted = highlightedService === service.service_id;
          const isDisabled = completeness?.status === 'empty';
          const isPartial = completeness?.status === 'partial';
          const isSelected = selectedServices.includes(service.service_id);

          return (
            <Card 
              key={service.id}
              className={cn(
                "transition-all duration-300",
                isDisabled && "opacity-60 cursor-not-allowed bg-muted",
                isHighlighted && "ring-2 ring-orange-500 shadow-lg animate-pulse",
                !isDisabled && "hover:shadow-md cursor-pointer",
                isSelected && "border-primary shadow-md ring-2 ring-primary/20"
              )}
              onClick={() => !isDisabled && handleServiceToggle(service.service_id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      "p-2.5 rounded-lg transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary",
                      isDisabled && "bg-muted"
                    )}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-sm sm:text-base">
                          {service.name}
                        </CardTitle>
                        {isDisabled && (
                          <Lock className="h-3 w-3 text-red-600 flex-shrink-0" />
                        )}
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs font-mono mb-2">
                        {service.service_id}
                      </Badge>
                      {completeness && (
                        <p className={cn(
                          "text-xs font-medium mb-2",
                          getStatusColor(completeness.status)
                        )}>
                          {getStatusLabel(completeness.status)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => !isDisabled && handleServiceToggle(service.service_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {service.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                )}
                
                {isDisabled && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-2 text-xs text-red-900 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Service non disponible : aucune donnée
                  </div>
                )}
                
                {isPartial && !isDisabled && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-2 text-xs text-orange-900 dark:text-orange-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Données incomplètes ({completeness.filledFields}/{completeness.totalFields})
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="secondary" className="text-xs sm:text-sm font-semibold">
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    {service.price_usd.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé et action */}
      {selectedServices.length > 0 && (
        <Card className="border-primary bg-primary/5 sticky bottom-4 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} sélectionné{selectedServices.length > 1 ? 's' : ''}
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  Total: ${totalPrice.toFixed(2)} USD
                </div>
              </div>
              <Button 
                size="lg"
                onClick={handleProceedToSearch}
                className="w-full sm:w-auto"
              >
                Continuer vers la recherche
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message si aucun service sélectionné */}
      {selectedServices.length === 0 && (
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">
            Sélectionnez au moins un service pour continuer
          </div>
        </div>
      )}

      {/* Dialogue de complétude des données */}
      {selectedServiceForDialog && (
        <ServiceCompletenessDialog
          open={completenessDialogOpen}
          onOpenChange={setCompletenessDialogOpen}
          serviceName={selectedServiceForDialog.name}
          completeness={selectedServiceForDialog.completeness}
          onContribute={handleContribute}
          onProceed={handleProceedWithPartialData}
        />
      )}

      {/* Dialogue de contribution CCC */}
      {contributionTarget && (
        <CadastralContributionDialog
          open={contributionDialogOpen}
          onOpenChange={setContributionDialogOpen}
          parcelNumber={contributionTarget.parcelNumber}
        />
      )}
    </div>
  );
};

export default CadastralServicesCatalog;
