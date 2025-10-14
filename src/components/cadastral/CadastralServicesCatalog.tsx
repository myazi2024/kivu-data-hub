import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  History, 
  MapPin, 
  Shield, 
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus
} from 'lucide-react';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { useNavigate } from 'react-router-dom';

interface CadastralServicesCatalogProps {
  searchResult?: any;
  onContributeClick?: (serviceId: string, missingFields: any[]) => void;
}

const CadastralServicesCatalog: React.FC<CadastralServicesCatalogProps> = ({ 
  searchResult,
  onContributeClick 
}) => {
  const { services, loading } = useCadastralServices();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [highlightedService, setHighlightedService] = useState<string | null>(null);
  const [showDataAlert, setShowDataAlert] = useState<string | null>(null);
  const navigate = useNavigate();

  // Mock data completeness - à remplacer par les vraies données
  const getServiceDataStatus = (serviceId: string) => {
    if (!searchResult) return { status: 'unknown', missingCount: 0, totalCount: 0 };
    
    // Simuler l'analyse de complétude
    const mockStatuses: Record<string, any> = {
      'information': { status: 'partial', missingCount: 3, totalCount: 10 },
      'location_history': { status: 'complete', missingCount: 0, totalCount: 11 },
      'history': { status: 'empty', missingCount: 1, totalCount: 1 },
      'obligations': { status: 'partial', missingCount: 1, totalCount: 2 },
    };
    
    return mockStatuses[serviceId] || { status: 'unknown', missingCount: 0, totalCount: 0 };
  };

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
    const dataStatus = getServiceDataStatus(serviceId);
    
    // Si service vide, empêcher la sélection
    if (dataStatus.status === 'empty') {
      setHighlightedService(serviceId);
      setTimeout(() => setHighlightedService(null), 2000);
      return;
    }
    
    // Si service avec données partielles, montrer l'alerte
    if (dataStatus.status === 'partial') {
      setHighlightedService(serviceId);
      setShowDataAlert(serviceId);
      // Ne pas ajouter immédiatement au panier
      return;
    }
    
    // Sinon, ajouter normalement
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const confirmPartialServiceSelection = (serviceId: string) => {
    setSelectedServices(prev => [...prev, serviceId]);
    setShowDataAlert(null);
    setHighlightedService(null);
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
          const dataStatus = getServiceDataStatus(service.service_id);
          const isHighlighted = highlightedService === service.service_id;
          const showAlert = showDataAlert === service.service_id;
          const isEmpty = dataStatus.status === 'empty';
          const isPartial = dataStatus.status === 'partial';
          
          return (
            <div key={service.id} className="space-y-3">
              <Card 
                className={`group transition-all duration-300 ${
                  isEmpty 
                    ? 'opacity-60 cursor-not-allowed border-muted' 
                    : isSelected 
                      ? 'border-primary shadow-md ring-2 ring-primary/20 cursor-pointer' 
                      : isHighlighted
                        ? 'border-amber-500 shadow-lg ring-2 ring-amber-500/40 cursor-pointer animate-pulse'
                        : 'border-border hover:shadow-lg cursor-pointer'
                }`}
                onClick={() => !isEmpty && handleServiceToggle(service.service_id)}
              >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg transition-colors duration-300 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary group-hover:bg-primary/10'
                    }`}>
                      <IconComponent className={`h-6 w-6 ${
                        isSelected ? 'text-primary-foreground' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300 flex items-center gap-2">
                          {service.name}
                          {isEmpty && <Lock className="h-4 w-4 text-muted-foreground" />}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                          {isPartial && !isSelected && (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-mono">
                          {service.service_id}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {service.price_usd.toFixed(2)} USD
                        </Badge>
                      </div>
                      <CardDescription className="text-sm leading-relaxed space-y-1">
                        <span className="block">{service.description || 'Service cadastral professionnel'}</span>
                        {isEmpty && (
                          <Badge variant="outline" className="text-xs text-destructive border-destructive">
                            Pas de données
                          </Badge>
                        )}
                        {isPartial && (
                          <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500">
                            Données partielles ({dataStatus.missingCount}/{dataStatus.totalCount} manquantes)
                          </Badge>
                        )}
                        {dataStatus.status === 'complete' && (
                          <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500">
                            Données complètes
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Checkbox 
                    checked={isSelected}
                    disabled={isEmpty}
                    onCheckedChange={() => handleServiceToggle(service.service_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
            </Card>
            
            {/* Alerte pour données partielles */}
            {showAlert && isPartial && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm space-y-3">
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Ce service contient des informations partielles
                    </p>
                    <p className="text-amber-800 dark:text-amber-200 mb-3">
                      {dataStatus.missingCount} données sur {dataStatus.totalCount} sont manquantes. 
                      Vous pouvez contribuer à compléter ces informations et obtenir une récompense.
                    </p>
                  </div>
                  
                  {/* Informations disponibles et manquantes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">
                        Disponibles ({dataStatus.totalCount - dataStatus.missingCount})
                      </p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {/* Simuler des champs disponibles */}
                        <div>✓ Propriétaire actuel</div>
                        <div>✓ Superficie</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        Manquantes ({dataStatus.missingCount})
                      </p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {/* Simuler des champs manquants */}
                        <div className="flex items-center justify-between">
                          <span>✗ Type de construction</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContributeClick?.(service.service_id, []);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowDataAlert(null);
                        setHighlightedService(null);
                      }}
                      className="text-xs"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmPartialServiceSelection(service.service_id)}
                      className="text-xs"
                    >
                      Acheter quand même
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
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
