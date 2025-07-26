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
      color: "text-blue-600"
    },
    {
      icon: BarChart3,
      title: "Estimation de population",
      description: "Calcul de la population locative et superficie occupée",
      color: "text-green-600"
    },
    {
      icon: Calculator,
      title: "Recettes fiscales",
      description: "Estimation des recettes fiscales locatives théoriques",
      color: "text-purple-600"
    },
    {
      icon: TrendingUp,
      title: "Analyse comparative",
      description: "Diagnostic par quartier, commune et province",
      color: "text-orange-600"
    },
    {
      icon: FileText,
      title: "Diagnostic foncier",
      description: "Analyse des titres, risques et régularité administrative",
      color: "text-red-600"
    },
    {
      icon: Building2,
      title: "Projets immobiliers",
      description: "Appui en faisabilité, développement et data urbaine",
      color: "text-indigo-600"
    },
    {
      icon: GraduationCap,
      title: "Formation",
      description: "Collecte mobile, SIG, analyse territoriale et gestion d'indicateurs",
      color: "text-teal-600"
    },
    {
      icon: Users,
      title: "Conseil stratégique",
      description: "Accompagnement des acteurs publics et privés",
      color: "text-pink-600"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                      <IconComponent className={`h-6 w-6 ${service.color} group-hover:text-primary transition-colors duration-300`} />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
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