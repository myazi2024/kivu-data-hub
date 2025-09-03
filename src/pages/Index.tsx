import React from 'react';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import territorialMapIllustration from '@/assets/territorial-map-illustration.webp';
import { 
  Map, 
  BarChart3, 
  Calculator, 
  Users, 
  FileText, 
  Building2,
  GraduationCap,
  TrendingUp 
} from 'lucide-react';

const Index = () => {
  const services = [
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
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      
      {/* À propos section */}
      <section className="section-padding bg-secondary/30">
        <div className="max-w-4xl mx-auto container-padding">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6 sm:mb-8 text-center">À propos du BIC</h2>
          
          <div className="mb-8 sm:mb-12">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-3 sm:mb-4">Qui sommes-nous ?</h3>
            <p className="text-muted-foreground text-responsive-sm leading-relaxed mb-4 sm:mb-6">
              Fondé par des experts en droit, données urbaines et innovation numérique, le BIC (Bureau de l'Immobilier du Congo) 
              est né pour répondre à un besoin urgent : Comprendre les réalités foncières et locatives à travers des données concrètes et contextualisées.
            </p>
            <figure className="mt-4">
              <img
                src={territorialMapIllustration}
                alt="Illustration de carte territoriale et données urbaines"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg shadow-card"
              />
            </figure>
          </div>

          <div className="mb-8 sm:mb-12">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-3 sm:mb-4">Notre méthode</h3>
            <p className="text-muted-foreground text-responsive-sm leading-relaxed mb-3 sm:mb-4">
              Nous combinons plusieurs sources pour produire des diagnostics complets :
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-responsive-sm space-y-1 sm:space-y-2 ml-2 sm:ml-4">
              <li>Collecte numérique via l'application <strong>Myazi Immobilier</strong></li>
              <li>Enquêtes terrain et remontées communautaires</li>
              <li>Imagerie satellite (OSM, Mapbox)</li>
              <li>Modélisation statistique et cartographie interactive</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Services détaillés section */}
      <section className="section-padding">
        <div className="max-w-6xl mx-auto container-padding">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">Nos Services Détaillés</h2>
            <p className="text-responsive-base text-muted-foreground max-w-3xl mx-auto">
              Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets. 
              Nous proposons des solutions adaptées aux besoins des territoires congolais.
            </p>
          </div>

          <div className="responsive-grid-3">{services.map((service, index) => {
              const IconComponent = service.icon;
              
              return (
                <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20 h-full">
                  <CardHeader className="text-center pb-3 sm:pb-4">
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <div className="p-3 sm:p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                        <IconComponent className={`h-6 w-6 sm:h-8 sm:w-8 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                      </div>
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
