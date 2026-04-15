import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Map, 
  FileText, 
  Scale, 
  Home,
  ArrowRightLeft,
  ShieldCheck,
  History
} from 'lucide-react';

const Services = () => {
  const [searchParams] = useSearchParams();
  const [showSearchBar, setShowSearchBar] = React.useState(false);
  const navigate = useNavigate();
  
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
      variant: "primary",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: Map,
      title: "Carte interactive",
      description: "Visualisez les parcelles et données foncières sur une carte dynamique",
      variant: "secondary",
      action: () => navigate('/map')
    },
    {
      icon: FileText,
      title: "Demande de titre foncier",
      description: "Soumettez une demande de titre foncier initial ou de renouvellement en ligne",
      variant: "primary",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: Home,
      title: "Expertise immobilière",
      description: "Demandez une expertise officielle pour évaluer la valeur d'un bien immobilier",
      variant: "secondary",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: ArrowRightLeft,
      title: "Demande de mutation",
      description: "Initiez une procédure de transfert de propriété foncière",
      variant: "accent",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: Scale,
      title: "Litiges fonciers",
      description: "Accédez aux informations sur les litiges enregistrés sur une parcelle",
      variant: "primary",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: ShieldCheck,
      title: "Vérifier hypothèque",
      description: "Vérifiez si une parcelle est grevée d'une hypothèque avant toute transaction",
      variant: "secondary",
      action: () => navigate('/cadastral-map')
    },
    {
      icon: History,
      title: "Historique fiscal",
      description: "Consultez l'historique des taxes et obligations fiscales liées à une parcelle",
      variant: "accent",
      action: () => navigate('/cadastral-map')
    }
  ];

  return (
    <>
      <Helmet>
        <title>Services cadastraux | BIC - Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Découvrez nos services cadastraux en RDC : recherche de parcelles, titres fonciers, expertise immobilière, mutations, litiges et vérification d'hypothèques." />
      </Helmet>

      <div className="min-h-dvh">
        <Navigation />
        <main className="pt-16 sm:pt-20 pb-12 sm:pb-16">
          <div className="max-w-[360px] sm:max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
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
                  Accédez aux informations cadastrales de n'importe quelle propriété en RDC. 
                  Nos services numériques vous permettent de consulter, vérifier et documenter les données foncières en quelques clics.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {services.map((service, index) => {
                const IconComponent = service.icon;
                const getIconColor = (variant: string) => {
                  switch (variant) {
                    case 'primary': return 'text-primary';
                    case 'secondary': return 'text-primary/80';
                    case 'accent': return 'text-primary/60';
                    default: return 'text-primary';
                  }
                };
                
                return (
                  <Card 
                    key={index} 
                    className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/20 rounded-2xl overflow-hidden cursor-pointer"
                    onClick={service.action}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); service.action(); } }}
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
    </>
  );
};

export default Services;
