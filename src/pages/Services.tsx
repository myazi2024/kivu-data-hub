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
  ShoppingCart,
  ArrowLeft,
  MapPin,
  History,
  Shield,
  Loader2,
  Info,
  CheckCircle2,
  DollarSign,
  Ruler
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart, CartItem } from '@/hooks/useCart';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
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
  
  // Mapping des icônes et descriptions détaillées pour les services cadastraux
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

  const getServiceDetails = (serviceId: string) => {
    const detailsMap: Record<string, { category: string, items: string[] }> = {
      'information': {
        category: 'Informations Générales',
        items: ['Numéro de parcelle', 'Superficie (m²)', 'Type de construction', 'Usage déclaré', 'Localisation complète']
      },
      'location_history': {
        category: 'Coordonnées GPS',
        items: ['Coordonnées des bornes', 'Dimensions des côtés', 'Plan cadastral', 'Carte interactive']
      },
      'history': {
        category: 'Historique de Propriété',
        items: ['Propriétaires actuels', 'Anciens propriétaires', 'Dates de mutation', 'Type de mutation', 'Documents justificatifs']
      },
      'obligations': {
        category: 'Obligations Fiscales',
        items: ['Taxes foncières', 'Historique des paiements', 'Hypothèques actives', 'État des dettes', 'Reçus de paiement']
      },
      'legal_verification': {
        category: 'Vérification Légale',
        items: ['Type de titre de propriété', 'Documents justificatifs', 'État légal', 'Validité du titre']
      },
      'building_permits': {
        category: 'Permis de Construire',
        items: ['Permis existants', 'Dates de délivrance', 'Service émetteur', 'Validité', 'Documents officiels']
      },
      'boundaries': {
        category: 'Limites de Parcelle',
        items: ['Bornes GPS', 'Dimensions exactes', 'Voisins limitrophes', 'Plan des limites']
      }
    };
    return detailsMap[serviceId] || { category: 'Données Cadastrales', items: [] };
  };

  // Grouper les services par catégorie pour un affichage plus compact sur mobile
  const groupedServices = React.useMemo(() => {
    if (!cadastralServices || cadastralServices.length === 0) return {};
    
    return cadastralServices.reduce((acc, service) => {
      const details = getServiceDetails(service.id);
      const category = details.category;
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, typeof cadastralServices>);
  }, [cadastralServices]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5">
      <Navigation />
      <main className="pt-14 sm:pt-16 pb-6 sm:pb-12">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
          {/* En-tête avec retour si catalogue cadastral */}
          {isCadastralCatalog && (
            <div className="mb-3 sm:mb-4 animate-fade-in">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-2 hover:bg-primary/10 h-8 text-xs sm:text-sm"
                size="sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                Retour
              </Button>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge variant="default" className="text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
                  Parcelle {parcelNumber}
                </Badge>
                {cadastralServices.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {cadastralServices.length} services
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-4 sm:mb-6 animate-fade-in">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2 sm:mb-3">
              {isCadastralCatalog ? 'Catalogue de Services' : 'Nos Services'}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2 leading-relaxed">
              {isCadastralCatalog 
                ? 'Données cadastrales alignées sur le formulaire CCC'
                : 'Nos outils et livrables pour les enjeux urbains'
              }
            </p>
          </div>

          {/* Affichage des services cadastraux (depuis la base de données) */}
          {isCadastralCatalog && (
            <>
              {servicesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-2 sm:p-3">
                      <div className="flex flex-col items-center space-y-2">
                        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : servicesError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="text-xs sm:text-sm">
                    Erreur : {servicesError}
                  </AlertDescription>
                </Alert>
              ) : cadastralServices.length === 0 ? (
                <Alert className="mb-4">
                  <AlertDescription className="text-xs sm:text-sm">
                    Aucun service disponible pour le moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Affichage mobile ultra-compact (une grille) */}
                  {isMobile ? (
                    <div className="grid grid-cols-2 gap-2">
                      {cadastralServices.map((service) => {
                        const IconComponent = getServiceIcon(service.id);
                        const details = getServiceDetails(service.id);
                        
                        return (
                          <Card 
                            key={service.id} 
                            className="group hover:shadow-md transition-all duration-200 border-border hover:border-primary/30 flex flex-col overflow-hidden"
                          >
                            <CardHeader className="text-center p-2 pb-1">
                              <div className="flex justify-center mb-1.5">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                </div>
                              </div>
                              <CardTitle className="text-[10px] font-semibold text-foreground leading-tight px-1 line-clamp-2 min-h-[2rem]">
                                {service.name}
                              </CardTitle>
                              <div className="mt-1">
                                <span className="text-sm font-bold text-primary">
                                  ${service.price}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-2 pt-0">
                              <Button
                                onClick={() => handleAddToCart(service.id, service.name, service.price)}
                                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary h-7 text-[10px] shadow-sm"
                                size="sm"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Ajouter
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    /* Affichage desktop avec onglets par catégorie */
                    <Tabs defaultValue={Object.keys(groupedServices)[0]} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1 h-auto p-1">
                        {Object.keys(groupedServices).map((category) => (
                          <TabsTrigger 
                            key={category} 
                            value={category}
                            className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                          >
                            {category.split(' ')[0]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {Object.entries(groupedServices).map(([category, services]) => (
                        <TabsContent key={category} value={category} className="mt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {services.map((service) => {
                              const IconComponent = getServiceIcon(service.id);
                              const details = getServiceDetails(service.id);
                              
                              return (
                                <Card 
                                  key={service.id} 
                                  className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 flex flex-col overflow-hidden"
                                >
                                  <CardHeader className="text-center pb-2 pt-4 px-3">
                                    <div className="flex justify-center mb-2">
                                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
                                        <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-primary group-hover:scale-110 transition-transform duration-300" />
                                      </div>
                                    </div>
                                    <CardTitle className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-tight mb-1.5">
                                      {service.name}
                                    </CardTitle>
                                    <div className="mt-1">
                                      <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                        ${service.price}
                                      </span>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="flex-1 flex flex-col pt-0 pb-3 px-3">
                                    <CardDescription className="text-center text-muted-foreground leading-relaxed text-[11px] sm:text-xs mb-2">
                                      {service.description}
                                    </CardDescription>
                                    
                                    {/* Détails des données incluses */}
                                    <div className="mb-3 bg-secondary/30 rounded-lg p-2">
                                      <p className="text-[10px] font-semibold text-foreground mb-1.5 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                        Données incluses:
                                      </p>
                                      <ul className="space-y-0.5">
                                        {details.items.slice(0, 3).map((item, idx) => (
                                          <li key={idx} className="text-[9px] text-muted-foreground flex items-start gap-1">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                        {details.items.length > 3 && (
                                          <li className="text-[9px] text-primary font-medium">
                                            +{details.items.length - 3} autres données
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                    
                                    <Button
                                      onClick={() => handleAddToCart(service.id, service.name, service.price)}
                                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-200 h-8"
                                      size="sm"
                                    >
                                      <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                                      <span className="text-xs">Ajouter au panier</span>
                                    </Button>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}

                  {/* Informations alignement CCC */}
                  <Alert className="mt-4 bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs sm:text-sm">
                      <strong>Alignement formulaire CCC:</strong> Ces services correspondent exactement aux données collectées via le formulaire de Contribution Collaborative au Cadastre. 
                      Chaque service vendu reflète un bloc d'informations du formulaire CCC.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </>
          )}

          {/* Affichage des services généraux (hardcodés) */}
          {!isCadastralCatalog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
                    <CardHeader className="text-center pb-2 sm:pb-3">
                      <div className="flex justify-center mb-2 sm:mb-3">
                        <div className="p-2.5 sm:p-3 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                          <IconComponent className={`h-5 w-5 sm:h-7 sm:w-7 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                        </div>
                      </div>
                      <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
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