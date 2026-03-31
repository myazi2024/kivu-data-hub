import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Map, 
  FileText, 
  Scale, 
  Receipt, 
  ShieldCheck 
} from 'lucide-react';

const Services = () => {
  const [searchParams] = useSearchParams();
  const [showSearchBar, setShowSearchBar] = React.useState(false);
  
  // Détecter si on arrive avec un paramètre de recherche
  React.useEffect(() => {
    const hasSearch = searchParams.get('search');
    if (hasSearch) {
      setShowSearchBar(true);
    }
  }, [searchParams]);
  
  const services = [
    {
      icon: Search,
      title: "Recherche cadastrale",
      description: "Recherchez n'importe quelle parcelle en RDC par numéro, propriétaire ou localisation",
      variant: "primary"
    },
    {
      icon: Map,
      title: "Carte interactive",
      description: "Visualisez les parcelles et données foncières sur une carte dynamique",
      variant: "secondary"
    },
    {
      icon: FileText,
      title: "Fiche parcellaire",
      description: "Consultez les informations détaillées d'une parcelle : propriétaire, superficie, titre",
      variant: "accent"
    },
    {
      icon: Scale,
      title: "Litiges fonciers",
      description: "Accédez aux informations sur les litiges enregistrés sur une parcelle",
      variant: "primary"
    },
    {
      icon: Receipt,
      title: "Contributions cadastrales",
      description: "Historique des paiements et contributions liés à une parcelle",
      variant: "secondary"
    },
    {
      icon: ShieldCheck,
      title: "Certificat cadastral",
      description: "Obtenez un certificat officiel avec les données cadastrales vérifiées",
      variant: "accent"
    }
  ];

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-[360px] sm:max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Afficher la barre de recherche cadastrale si paramètre search présent */}
          {showSearchBar && (
            <div className="mb-6 sm:mb-8">
              <CadastralSearchBar />
            </div>
          )}
          
          {!showSearchBar && (
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                Nos Services
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets. 
                Nous proposons des solutions adaptées aux besoins des territoires congolais.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {services.map((service, index) => {
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
                <Card 
                  key={index} 
                  className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/20 rounded-2xl overflow-hidden"
                >
                  <CardHeader className="text-center pb-2 sm:pb-3 pt-4 sm:pt-5 px-3 sm:px-4">
                    <div className="flex justify-center mb-2 sm:mb-3">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary group-hover:bg-primary/10 transition-colors duration-300 shadow-sm">
                        <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                      </div>
                    </div>
                    <CardTitle className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 sm:pb-5 px-3 sm:px-4">
                    <CardDescription className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {service.description}
                    </CardDescription>
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