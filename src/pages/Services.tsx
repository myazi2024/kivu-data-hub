import React from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
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

const Services = () => {
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

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-6">Nos Services</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Nos outils et livrables sont conçus pour répondre aux enjeux urbains concrets. 
              Nous proposons des solutions adaptées aux besoins des territoires congolais.
            </p>
            
            {/* Distinction services marketing vs cadastraux */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-primary mb-2">
                Services cadastraux payants
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Vous cherchez des informations cadastrales officielles ? 
                Consultez notre catalogue de services cadastraux avec tarifs détaillés.
              </p>
              <Link to="/services-cadastraux">
                <Button size="sm" className="mx-auto">
                  Voir les services cadastraux →
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20">
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                        <IconComponent className={`h-8 w-8 ${getIconColor(service.variant)} group-hover:text-primary transition-colors duration-300`} />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </CardTitle>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;