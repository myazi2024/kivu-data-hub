import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralSearchBar from '@/components/cadastral/CadastralSearchBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Map, 
  BarChart3, 
  Calculator, 
  Users, 
  FileText, 
  Building2,
  GraduationCap,
  TrendingUp,
  MapPin,
  History,
  DollarSign
} from 'lucide-react';

// Mapping des icônes pour les services cadastraux
const getServiceIcon = (serviceId: string) => {
  const iconMap: Record<string, any> = {
    'information': FileText,
    'location_history': MapPin,
    'history': History,
    'obligations': DollarSign,
    'cartographie': Map,
    'population': Users,
    'fiscale': Calculator,
    'analyse': BarChart3,
    'diagnostic': FileText,
    'projets': Building2,
    'formation': GraduationCap,
    'conseil': TrendingUp
  };
  
  return iconMap[serviceId] || FileText;
};

const Services = () => {
  const [searchParams] = useSearchParams();
  const [showSearchBar, setShowSearchBar] = React.useState(false);
  const { services: cadastralServices, loading, error } = useCadastralServices();
  
  // Détecter si on arrive avec un paramètre de recherche
  React.useEffect(() => {
    const hasSearch = searchParams.get('search');
    if (hasSearch) {
      setShowSearchBar(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Afficher la barre de recherche cadastrale si paramètre search présent */}
          {showSearchBar && (
            <div className="mb-8">
              <CadastralSearchBar />
            </div>
          )}
          
          {!showSearchBar && (
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold text-foreground mb-6">Catalogue de Services Cadastraux</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Accédez aux informations cadastrales dont vous avez besoin. Services officiels avec tarification transparente.
              </p>
            </div>
          )}

          {/* Affichage du catalogue depuis la base de données */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-2">
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-40 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive text-lg font-semibold">Erreur lors du chargement des services</p>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          ) : cadastralServices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Aucun service disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cadastralServices.map((service, index) => {
                const IconComponent = getServiceIcon(service.id);
                const variantColors = ['primary', 'secondary', 'accent', 'muted'];
                const variant = variantColors[index % variantColors.length];
                
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
                    key={service.id} 
                    className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20"
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4">
                        <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                          <IconComponent className={`h-8 w-8 ${getIconColor(variant)} group-hover:text-primary transition-colors duration-300`} />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                        {service.name}
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-primary">${service.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground ml-1">USD</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-muted-foreground leading-relaxed">
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