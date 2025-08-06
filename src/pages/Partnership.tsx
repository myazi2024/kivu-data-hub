import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, TrendingUp, Globe } from 'lucide-react';

const Partnership = () => {
  const partnershipTypes = [
    {
      icon: <Building className="h-8 w-8 text-primary" />,
      title: "Partenariats Institutionnels",
      description: "Collaboration avec les institutions gouvernementales et organisations internationales pour développer l'écosystème immobilier congolais."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Partenariats Privés",
      description: "Alliances stratégiques avec les entreprises privées pour innover dans le secteur immobilier et territorial."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Partenariats Technologiques",
      description: "Collaboration avec les acteurs tech pour développer des solutions numériques avancées."
    },
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: "Partenariats Internationaux",
      description: "Échanges et coopération avec les organismes internationaux spécialisés dans l'immobilier et l'urbanisme."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Partenariats</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Construisons ensemble l'avenir de l'immobilier en République Démocratique du Congo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {partnershipTypes.map((type, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {type.icon}
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-secondary/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Rejoignez notre réseau de partenaires</CardTitle>
              <CardDescription className="text-lg">
                Ensemble, développons des solutions innovantes pour le secteur immobilier congolais
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="mt-4">
                Devenir Partenaire
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Partnership;