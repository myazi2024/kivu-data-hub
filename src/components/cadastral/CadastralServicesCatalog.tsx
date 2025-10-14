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
  CheckCircle2
} from 'lucide-react';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { useNavigate } from 'react-router-dom';

const CadastralServicesCatalog: React.FC = () => {
  const { services, loading } = useCadastralServices();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const navigate = useNavigate();

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
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
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
          
          return (
            <Card 
              key={service.id}
              className={`group hover:shadow-lg transition-all duration-300 cursor-pointer ${
                isSelected ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border'
              }`}
              onClick={() => handleServiceToggle(service.service_id)}
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
                        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                          {service.name}
                        </CardTitle>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
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
                      <CardDescription className="text-sm leading-relaxed">
                        {service.description || 'Service cadastral professionnel'}
                      </CardDescription>
                    </div>
                  </div>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => handleServiceToggle(service.service_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
            </Card>
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
