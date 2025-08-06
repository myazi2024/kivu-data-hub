import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, MapPin, BarChart3, Users, Shield, Download } from 'lucide-react';

const Myazi = () => {
  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "Géolocalisation Précise",
      description: "Cartographie interactive des biens immobiliers avec données GPS précises pour chaque propriété."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Analyses de Marché",
      description: "Données en temps réel sur les tendances du marché immobilier local avec analyses prédictives."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Réseau Communautaire",
      description: "Plateforme collaborative permettant aux utilisateurs de partager et valider les informations immobilières."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Données Sécurisées",
      description: "Protection avancée des données avec cryptage et sauvegarde automatique des informations collectées."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <Smartphone className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Plateforme Myazi</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              L'application mobile révolutionnaire pour la collecte et l'analyse des données immobilières 
              en République Démocratique du Congo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Télécharger sur Android</span>
              </Button>
              <Button variant="outline" size="lg" className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Télécharger sur iOS</span>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {feature.icon}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* How it Works */}
          <Card className="bg-secondary/30">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">Comment ça fonctionne ?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Téléchargez l'app</h3>
                  <p className="text-muted-foreground">Installez Myazi Immobilier sur votre smartphone</p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Collectez les données</h3>
                  <p className="text-muted-foreground">Photographiez et géolocalisez les propriétés immobilières</p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Analysez les résultats</h3>
                  <p className="text-muted-foreground">Accédez aux analyses et rapports détaillés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Myazi;