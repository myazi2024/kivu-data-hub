import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Link } from 'react-router-dom';

const ServicesSection = () => {
  const services = [
    {
      icon: Map,
      title: "Cartographie dynamique",
      description: "Visualisation des loyers et taux de vacance par zone géographique",
      variant: "primary"
    },
    {
      icon: BarChart3,
      title: "Estimation de population",
      description: "Calcul de la population locative et superficie occupée",
      variant: "secondary"
    },
    {
      icon: Calculator,
      title: "Recettes fiscales",
      description: "Estimation des recettes fiscales locatives théoriques",
      variant: "accent"
    },
    {
      icon: TrendingUp,
      title: "Analyse comparative",
      description: "Diagnostic par quartier, commune et province",
      variant: "muted"
    },
    {
      icon: FileText,
      title: "Diagnostic foncier",
      description: "Analyse des titres, risques et régularité administrative",
      variant: "primary"
    },
    {
      icon: Building2,
      title: "Projets immobiliers",
      description: "Appui en faisabilité, développement et data urbaine",
      variant: "secondary"
    },
    {
      icon: GraduationCap,
      title: "Formation",
      description: "Collecte mobile, SIG, analyse territoriale et gestion d'indicateurs",
      variant: "accent"
    },
    {
      icon: Users,
      title: "Conseil stratégique",
      description: "Accompagnement des acteurs publics et privés",
      variant: "muted"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nos Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets. 
            Nous proposons des solutions adaptées aux besoins des territoires congolais.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
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
              <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20 focus-visible-ring hover-interactive h-full flex flex-col">
                <CardHeader className="text-center pb-2 sm:pb-3 flex-1 p-3 sm:p-4">
                  <div className="flex justify-center mb-1 sm:mb-2">
                    <div className="p-1.5 sm:p-2 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                      <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                    </div>
                  </div>
                  <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-tight">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 p-3 sm:p-4">
                  <CardDescription className="text-center text-muted-foreground leading-snug text-xs sm:text-sm line-clamp-2 sm:line-clamp-3">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Link to="/services">
            <Button size="lg" className="px-8 py-3">
              Découvrir tous nos services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;