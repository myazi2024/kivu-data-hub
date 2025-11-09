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
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart, CartItem } from '@/hooks/useCart';

type CadastralService = {
  icon: typeof Home | typeof DollarSign | typeof Landmark | typeof Ruler | typeof Building2 | typeof Scale;
  title: string;
  description: string;
  price: number;
  variant: string;
};

type GeneralService = {
  icon: typeof Map | typeof BarChart3 | typeof Calculator | typeof TrendingUp | typeof FileText | typeof Building2 | typeof GraduationCap | typeof Users;
  title: string;
  description: string;
  variant: string;
};

type Service = CadastralService | GeneralService;

const Services = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [parcelNumber, setParcelNumber] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parcel = params.get('parcel');
    setParcelNumber(parcel);
  }, [location]);

  const handleAddToCart = (serviceName: string, price: number) => {
    if (!parcelNumber) {
      toast({
        title: "Erreur",
        description: "Numéro de parcelle manquant",
        variant: "destructive"
      });
      return;
    }

    const cartItem: CartItem = {
      id: `${parcelNumber}-${serviceName.toLowerCase().replace(/\s+/g, '-')}`,
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

  // Services cadastraux spécifiques pour une parcelle
  const cadastralServices: CadastralService[] = [
    {
      icon: Home,
      title: "Historique de propriété",
      description: "Accédez à l'historique complet des transferts de propriété et des mutations",
      price: 5,
      variant: "primary"
    },
    {
      icon: DollarSign,
      title: "Obligations fiscales",
      description: "Consultez l'historique des paiements d'impôts fonciers et les montants dus",
      price: 3,
      variant: "secondary"
    },
    {
      icon: Landmark,
      title: "Hypothèques et charges",
      description: "Vérifiez les hypothèques, servitudes et autres charges grevant la propriété",
      price: 8,
      variant: "accent"
    },
    {
      icon: Ruler,
      title: "Historique des limites",
      description: "Suivez l'évolution des délimitations et bornages de la parcelle",
      price: 4,
      variant: "primary"
    },
    {
      icon: Building2,
      title: "Permis de construire",
      description: "Accédez aux permis de construire délivrés et leur statut",
      price: 3,
      variant: "secondary"
    },
    {
      icon: Scale,
      title: "Statut juridique complet",
      description: "Rapport complet incluant tous les aspects juridiques et administratifs",
      price: 15,
      variant: "accent"
    }
  ];

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

  const servicesToDisplay: Service[] = parcelNumber ? cadastralServices : generalServices;
  const isCadastralCatalog = Boolean(parcelNumber);

  const isCadastralService = (service: Service): service is CadastralService => {
    return 'price' in service;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16 sm:pt-20 pb-8 sm:pb-16">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* En-tête avec retour si catalogue cadastral */}
          {isCadastralCatalog && (
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="default" className="text-sm px-3 py-1">
                  Parcelle {parcelNumber}
                </Badge>
              </div>
            </div>
          )}

          <div className="text-center mb-8 sm:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">
              {isCadastralCatalog ? 'Catalogue de Services Cadastraux' : 'Nos Services'}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
              {isCadastralCatalog 
                ? 'Sélectionnez les données que vous souhaitez consulter pour cette parcelle. Ajoutez-les au panier pour procéder au paiement.'
                : 'Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets. Nous proposons des solutions adaptées aux besoins des territoires congolais.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {servicesToDisplay.map((service, index) => {
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
              
              const isPriced = isCadastralService(service);
              
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
                    {isPriced && (
                      <div className="mt-2">
                        <span className="text-xl sm:text-2xl font-bold text-primary">${service.price}</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <CardDescription className="text-center text-muted-foreground leading-relaxed text-xs sm:text-sm flex-1">
                      {service.description}
                    </CardDescription>
                    {isPriced && (
                      <Button
                        onClick={() => handleAddToCart(service.title, service.price)}
                        className="w-full mt-4 bg-primary hover:bg-primary/90"
                        size="sm"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Ajouter au panier
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;