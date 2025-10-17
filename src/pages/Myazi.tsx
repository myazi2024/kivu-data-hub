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
      <main className="pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <Smartphone className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Myazi Immobilier</h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 px-2">
              Collecte de données immobilières pour analyses BIC
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
              <Button size="sm" className="flex items-center space-x-1 text-xs">
                <Download className="h-3 w-3" />
                <span>Android</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-1 text-xs">
                <Download className="h-3 w-3" />
                <span>iOS</span>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-start space-x-2">
                  <div className="mt-0.5">
                    {React.cloneElement(feature.icon, { className: "h-5 w-5 text-primary" })}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* How it Works */}
          <Card className="bg-secondary/20 p-4">
            <h2 className="text-lg font-semibold text-center mb-4">Processus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-primary/15 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <h3 className="text-sm font-medium mb-1">Téléchargez</h3>
                <p className="text-xs text-muted-foreground">Installez l'app mobile</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/15 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <h3 className="text-sm font-medium mb-1">Collectez</h3>
                <p className="text-xs text-muted-foreground">Photos & géolocalisation</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/15 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <h3 className="text-sm font-medium mb-1">Analysez</h3>
                <p className="text-xs text-muted-foreground">Rapports BIC détaillés</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Myazi;