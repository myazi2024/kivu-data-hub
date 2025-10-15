import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  History, 
  MapPin, 
  Shield, 
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { useNavigate } from 'react-router-dom';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralDataCompleteness } from '@/hooks/useCadastralDataCompleteness';
import PartialServiceNotification from './PartialServiceNotification';
import { useAuth } from '@/hooks/useAuth';

interface CadastralServicesCatalogProps {
  searchResult?: CadastralSearchResult | null;
  onContributeClick?: (serviceId: string, missingFields: string[]) => void;
}

const CadastralServicesCatalog: React.FC<CadastralServicesCatalogProps> = ({
  searchResult,
  onContributeClick
}) => {
  const { services, loading } = useCadastralServices();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showPartialWarning, setShowPartialWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { servicesCompleteness } = useCadastralDataCompleteness(searchResult);

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

  // Mapper les service_id de la BDD aux serviceId de complétude (mapping 1:1 direct)
  const getCompletenessForService = (serviceId: string) => {
    // Les IDs sont maintenant cohérents entre la BDD et l'analyse de complétude
    return servicesCompleteness.find(s => s.serviceId === serviceId);
  };

  const handleServiceToggle = (serviceId: string) => {
    // Vérifier la complétude si searchResult est fourni
    if (searchResult) {
      const completeness = getCompletenessForService(serviceId);
      
      // Si le service est vide, ne pas permettre la sélection
      if (completeness && completeness.status === 'empty') {
        return;
      }
      
      // Si le service est partiel et qu'on essaie de le sélectionner
      if (completeness && completeness.status === 'partial' && !selectedServices.includes(serviceId)) {
        setShowPartialWarning(serviceId);
        return;
      }
    }

    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleConfirmPartialService = (serviceId: string) => {
    setSelectedServices(prev => [...prev, serviceId]);
    setShowPartialWarning(null);
  };

  const handleContribute = (serviceId: string, missingFieldKeys: string[]) => {
    if (!user) {
      navigate('/auth', { state: { from: '/services-cadastraux' } });
      return;
    }
    
    console.log('📋 Catalogue - Contribution:', { serviceId, missingFieldKeys });
    
    if (onContributeClick) {
      onContributeClick(serviceId, missingFieldKeys);
    }
    setShowPartialWarning(null);
  };

  const totalPrice = services
    .filter(service => selectedServices.includes(service.service_id))
    .reduce((sum, service) => sum + service.price_usd, 0);

  const handleProceedToSearch = () => {
    if (selectedServices.length === 0) {
      return;
    }
    // Rediriger vers la plateforme Myazi avec les services sélectionnés
    navigate('/myazi', { state: { preselectedServices: selectedServices } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Services Cadastraux
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Accédez aux informations cadastrales officielles pour vos projets immobiliers, 
          juridiques ou de développement territorial.
        </p>
      </div>

      {/* Informations importantes */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Comment ça marche ?</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => {
          const IconComponent = getServiceIcon(service.service_id);
          const isSelected = selectedServices.includes(service.service_id);
          const completeness = searchResult ? getCompletenessForService(service.service_id) : null;
          const isEmpty = completeness?.status === 'empty';
          const isPartial = completeness?.status === 'partial';
          const isComplete = completeness?.status === 'complete';
          const showWarning = showPartialWarning === service.service_id;
          
          return (
            <div key={service.id} className="space-y-3">
              <Card 
                className={`group transition-all duration-300 ${
                  isEmpty 
                    ? 'opacity-50 cursor-not-allowed border-muted' 
                    : 'hover:shadow-lg cursor-pointer'
                } ${
                  isSelected ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border'
                } ${
                  showWarning ? 'ring-2 ring-amber-500' : ''
                }`}
                onClick={() => !isEmpty && handleServiceToggle(service.service_id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg transition-colors duration-300 relative ${
                        isEmpty 
                          ? 'bg-muted' 
                          : isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary group-hover:bg-primary/10'
                      }`}>
                        {isEmpty && (
                          <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                        )}
                        <IconComponent className={`h-6 w-6 ${
                          isEmpty 
                            ? 'text-muted-foreground' 
                            : isSelected 
                              ? 'text-primary-foreground' 
                              : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <CardTitle className={`text-lg transition-colors duration-300 ${
                            isEmpty ? 'text-muted-foreground' : 'group-hover:text-primary'
                          }`}>
                            {service.name}
                          </CardTitle>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          {isPartial && !isSelected && (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {service.service_id}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {service.price_usd.toFixed(2)} USD
                          </Badge>
                          {completeness && (
                            <>
                              {isEmpty && (
                                <Badge variant="destructive" className="text-xs">
                                  Pas de données
                                </Badge>
                              )}
                              {isPartial && (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                                  Données partielles ({completeness.missingFields.length} manquantes)
                                </Badge>
                              )}
                              {isComplete && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  Complet
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <CardDescription className="text-sm leading-relaxed">
                          {service.description || 'Service cadastral professionnel'}
                        </CardDescription>
                      </div>
                    </div>
                    <Checkbox 
                      checked={isSelected}
                      disabled={isEmpty}
                      onCheckedChange={() => !isEmpty && handleServiceToggle(service.service_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </CardHeader>
              </Card>

              {/* Afficher la notification si le service est partiellement sélectionné */}
              {showWarning && completeness && (
                <PartialServiceNotification
                  service={completeness}
                  serviceName={service.name}
                  onClose={() => setShowPartialWarning(null)}
                  onContinueAnyway={() => handleConfirmPartialService(service.service_id)}
                  onContribute={(missingFieldKeys) => handleContribute(service.service_id, missingFieldKeys)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé et action */}
      {selectedServices.length > 0 && (
        <Card className="border-primary bg-primary/5 sticky bottom-4">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} sélectionné{selectedServices.length > 1 ? 's' : ''}
                </div>
                <div className="text-2xl font-bold text-foreground">
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
          <div className="text-muted-foreground">
            Sélectionnez au moins un service pour continuer
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastralServicesCatalog;
