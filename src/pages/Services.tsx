import React, { useEffect, useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Map, 
  BarChart3, 
  Calculator, 
  Users, 
  FileText, 
  Building2,
  GraduationCap,
  TrendingUp,
  Home,
  DollarSign,
  Landmark,
  Ruler,
  Scale,
  ShoppingCart,
  ArrowLeft,
  MapPin,
  History,
  Shield,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart, CartItem } from '@/hooks/useCart';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type GeneralService = {
  icon: typeof Map | typeof BarChart3 | typeof Calculator | typeof TrendingUp | typeof FileText | typeof Building2 | typeof GraduationCap | typeof Users;
  title: string;
  description: string;
  variant: string;
};

const Services = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [parcelNumber, setParcelNumber] = useState<string | null>(null);
  
  // Hook réactif pour les services cadastraux
  const { services: cadastralServices, loading: servicesLoading, error: servicesError } = useCadastralServices();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parcel = params.get('parcel');
    setParcelNumber(parcel);
  }, [location]);

  const handleAddToCart = (serviceId: string, serviceName: string, price: number) => {
    if (!parcelNumber) {
      toast({
        title: "Erreur",
        description: "Numéro de parcelle manquant",
        variant: "destructive"
      });
      return;
    }

    const cartItem: CartItem = {
      id: `${parcelNumber}-${serviceId}`,
      title: `${serviceName} - Parcelle ${parcelNumber}`,
      price: price,
      description: `Service cadastral pour la parcelle ${parcelNumber}`
    };

    addToCart(cartItem);

    toast({
      title: "Ajouté au panier",
      description: `${serviceName} pour la parcelle ${parcelNumber}`,
    });
  };

  // Services généraux
  const generalServices: GeneralService[] = [
    {
      icon: Map,
      title: "Cartographie dynamique",
      description: "Cartographie dynamique des loyers et taux de vacance par zone géographique",
      variant: "primary"
    },
    {
      icon: BarChart3,
      title: "Estimation de population",
      description: "Estimation de la population locative et de la superficie occupée",
      variant: "secondary"
    },
    {
      icon: Calculator,
      title: "Recettes fiscales",
      description: "Calcul des recettes fiscales locatives théoriques",
      variant: "accent"
    },
    {
      icon: TrendingUp,
      title: "Analyse comparative",
      description: "Analyse comparative par quartier / commune",
      variant: "muted"
    },
    {
      icon: FileText,
      title: "Diagnostic foncier",
      description: "Diagnostic foncier : titres, risques, régularité",
      variant: "primary"
    },
    {
      icon: Building2,
      title: "Projets immobiliers",
      description: "Appui aux projets immobiliers : faisabilité, développement, data urbaine",
      variant: "secondary"
    },
    {
      icon: GraduationCap,
      title: "Formation",
      description: "Formation : collecte mobile, SIG, analyse territoriale, gestion d'indicateurs",
      variant: "accent"
    },
    {
      icon: Users,
      title: "Conseil stratégique",
      description: "Accompagnement des acteurs publics et privés",
      variant: "muted"
    }
  ];

  const isCadastralCatalog = Boolean(parcelNumber);
  
  // Mapping des icônes pour les services cadastraux
  const getServiceIcon = (serviceId: string) => {
    const iconMap: Record<string, any> = {
      'information': FileText,
      'location_history': MapPin,
      'history': History,
      'obligations': DollarSign,
      'legal_verification': Shield,
      'building_permits': Building2,
      'boundaries': Ruler
    };
    return iconMap[serviceId] || FileText;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5">
      <Navigation />
      <main className="pt-16 sm:pt-20 pb-8 sm:pb-16">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* En-tête avec retour si catalogue cadastral */}
          {isCadastralCatalog && (
            <div className="mb-6 animate-fade-in">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-4 hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="default" className="text-xs sm:text-sm px-3 py-1 shadow-sm">
                  Parcelle {parcelNumber}
                </Badge>
                {cadastralServices.length > 0 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    {cadastralServices.length} services disponibles
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-4 sm:mb-6">
              {isCadastralCatalog ? 'Catalogue de Services Cadastraux' : 'Nos Services'}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-2 leading-relaxed">
              {isCadastralCatalog 
                ? 'Sélectionnez les données cadastrales que vous souhaitez consulter pour cette parcelle.'
                : 'Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets.'
              }
            </p>
          </div>

          {/* Affichage des services cadastraux (depuis la base de données) */}
          {isCadastralCatalog && (
            <>
              {servicesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-6">
                      <div className="flex flex-col items-center space-y-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : servicesError ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>
                    Erreur lors du chargement des services : {servicesError}
                  </AlertDescription>
                </Alert>
              ) : cadastralServices.length === 0 ? (
                <Alert className="mb-6">
                  <AlertDescription>
                    Aucun service cadastral disponible pour le moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  {cadastralServices.map((service) => {
                    const IconComponent = getServiceIcon(service.id);
                    
                    return (
                      <Card 
                        key={service.id} 
                        className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 flex flex-col overflow-hidden"
                      >
                        <CardHeader className="text-center pb-3 sm:pb-4 pt-5 sm:pt-6">
                          <div className="flex justify-center mb-3 sm:mb-4">
                            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
                              <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                            </div>
                          </div>
                          <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-tight mb-2 px-2">
                            {service.name}
                          </CardTitle>
                          <div className="mt-2">
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                              ${service.price}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-0 pb-5 px-4">
                          <CardDescription className="text-center text-muted-foreground leading-relaxed text-xs sm:text-sm flex-1 mb-4">
                            {service.description}
                          </CardDescription>
                          <Button
                            onClick={() => handleAddToCart(service.id, service.name, service.price)}
                            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-200"
                            size="sm"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            <span className="text-xs sm:text-sm">Ajouter au panier</span>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Affichage des services généraux (hardcodés) */}
          {!isCadastralCatalog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {generalServices.map((service, index) => {
                const IconComponent = service.icon;
                const getIconColor = (variant: string) => {
                  switch (variant) {
                    case 'primary':
                      return 'text-primary';
                    case 'secondary':
                      return 'text-primary/80';
                    case 'accent':
                      return 'text-primary/60';
                    case 'muted':
                      return 'text-muted-foreground';
                    default:
                      return 'text-primary';
                  }
                };
                
                return (
                  <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20 flex flex-col">
                    <CardHeader className="text-center pb-3 sm:pb-4">
                      <div className="flex justify-center mb-3 sm:mb-4">
                        <div className="p-3 sm:p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                          <IconComponent className={`h-6 w-6 sm:h-8 sm:w-8 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                        </div>
                      </div>
                      <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <CardDescription className="text-center text-muted-foreground leading-relaxed text-xs sm:text-sm flex-1">
                        {service.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;