import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, TrendingUp, Heart } from 'lucide-react';

const Careers = () => {
  const positions = [
    {
      title: "Analyste de Données Immobilières",
      location: "Goma, Nord-Kivu",
      type: "Temps plein",
      department: "Recherche & Analyse",
      description: "Rejoignez notre équipe pour analyser les tendances du marché immobilier congolais et produire des insights stratégiques."
    },
    {
      title: "Développeur Mobile",
      location: "Kinshasa / Télétravail",
      type: "Temps plein",
      department: "Technologie",
      description: "Participez au développement de l'application Myazi et des outils numériques innovants pour le secteur immobilier."
    },
    {
      title: "Coordinateur Terrain",
      location: "Bukavu, Sud-Kivu",
      type: "Temps plein",
      department: "Opérations",
      description: "Coordonnez les activités de collecte de données et supervisez les équipes terrain dans la région."
    },
    {
      title: "Spécialiste en Cartographie",
      location: "Goma, Nord-Kivu",
      type: "Contrat",
      department: "Géomatique",
      description: "Créez et maintenez les cartes interactives et analyses territoriales pour nos clients et partenaires."
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      title: "Croissance Professionnelle",
      description: "Opportunités de formation continue et évolution de carrière"
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Équipe Dynamique",
      description: "Travaillez avec des experts passionnés par l'innovation"
    },
    {
      icon: <Heart className="h-6 w-6 text-primary" />,
      title: "Impact Social",
      description: "Contribuez au développement du secteur immobilier congolais"
    },
    {
      icon: <Briefcase className="h-6 w-6 text-primary" />,
      title: "Flexibilité",
      description: "Horaires flexibles et possibilités de télétravail"
    }
  ];

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Rejoignez-nous</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Faites partie de l'équipe qui révolutionne le secteur immobilier en République Démocratique du Congo
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Open Positions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Postes Ouverts</h2>
            <div className="space-y-6">
              {positions.map((position, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl">{position.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span>{position.location}</span>
                          <span>•</span>
                          <span>{position.department}</span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{position.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{position.description}</p>
                    <Button>
                      Postuler
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <Card className="bg-secondary/50 text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Vous ne trouvez pas le poste idéal ?</CardTitle>
              <CardDescription className="text-lg">
                Envoyez-nous votre candidature spontanée. Nous sommes toujours à la recherche de talents exceptionnels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="mt-4">
                Candidature Spontanée
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Careers;