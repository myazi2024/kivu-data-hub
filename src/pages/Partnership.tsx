import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Users, 
  TrendingUp, 
  Globe, 
  Building2,
  FileText,
  Mail,
  Phone
} from 'lucide-react';

const Partnership = () => {
  const partnershipTypes = [
    {
      icon: Building2,
      title: "Partenariat Institutionnel",
      description: "Collaboration avec les institutions publiques, ONG et organismes de développement.",
      benefits: [
        "Accès aux données territoriales exclusives",
        "Support technique et méthodologique",
        "Formations personnalisées aux équipes"
      ],
      badge: "Recommandé"
    },
    {
      icon: Users,
      title: "Partenariat Commercial",
      description: "Intégration de nos services dans vos solutions ou développement conjoint.",
      benefits: [
        "API d'accès aux données immobilières",
        "Co-développement de produits",
        "Partage des revenus"
      ],
      badge: "Innovant"
    },
    {
      icon: Globe,
      title: "Partenariat Académique",
      description: "Collaboration avec les universités et centres de recherche.",
      benefits: [
        "Accès aux données pour recherche",
        "Encadrement d'étudiants",
        "Publications conjointes"
      ],
      badge: "Académique"
    },
    {
      icon: TrendingUp,
      title: "Partenariat Technologique",
      description: "Alliance avec les acteurs tech pour l'innovation dans le secteur immobilier.",
      benefits: [
        "Intégration technologique avancée",
        "Développement d'outils innovants",
        "Expansion géographique"
      ],
      badge: "Tech"
    }
  ];

  const currentPartners = [
    {
      name: "Université de Goma",
      type: "Académique",
      description: "Collaboration sur les recherches urbaines et territoriales"
    },
    {
      name: "Ville de Goma",
      type: "Institutionnel",
      description: "Support à la planification urbaine et fiscalité locale"
    },
    {
      name: "Actors of Change",
      type: "Développement",
      description: "Projets de développement communautaire et habitat"
    }
  ];

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Handshake className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">
              Partenariats Stratégiques
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Le BIC développe des partenariats durables pour maximiser l'impact de nos données 
              immobilières et territoriales. Rejoignez notre écosystème d'innovation.
            </p>
          </div>

          {/* Types de partenariats */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Types de Partenariats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {partnershipTypes.map((partnership, index) => {
                const IconComponent = partnership.icon;
                return (
                  <Card key={index} className="group hover:shadow-card transition-all duration-300 border-border hover:border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {partnership.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors duration-300">
                        {partnership.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {partnership.description}
                      </p>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Avantages :</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {partnership.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Partenaires actuels */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Nos Partenaires Actuels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPartners.map((partner, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <CardTitle className="text-lg">{partner.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit mx-auto">
                      {partner.type}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {partner.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Processus de partenariat */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-center text-foreground mb-8">
                Comment Devenir Partenaire ?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-primary/15 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Premier Contact</h3>
                  <p className="text-sm text-muted-foreground">
                    Contactez-nous pour discuter de vos besoins et objectifs
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/15 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Évaluation</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyse de compatibilité et définition du cadre de collaboration
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/15 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Accord</h3>
                  <p className="text-sm text-muted-foreground">
                    Négociation et signature de l'accord de partenariat
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/15 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Lancement</h3>
                  <p className="text-sm text-muted-foreground">
                    Mise en œuvre et suivi de la collaboration
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact pour partenariat */}
          <section className="text-center">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8">
                <FileText className="h-12 w-12 text-primary mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Intéressé par un Partenariat ?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Contactez notre équipe pour explorer les opportunités de collaboration 
                  et développer ensemble des solutions innovantes pour le secteur immobilier congolais.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Envoyer une proposition
                  </Button>
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Nous appeler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Partnership;