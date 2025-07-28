import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

const Publications = () => {
  const publications = [
    {
      title: "Analyse du marché immobilier – T1 2025",
      period: "Janvier - Mars 2025",
      description: "Rapport complet sur les tendances du marché immobilier au premier trimestre 2025",
      status: "Disponible",
      price: "Gratuit"
    },
    {
      title: "Analyse du marché immobilier – T2 2025", 
      period: "Avril - Juin 2025",
      description: "Analyse détaillée des évolutions du marché au deuxième trimestre",
      status: "Disponible",
      price: "Payant"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-6">Publications</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Le BIC publie régulièrement des rapports d'analyse urbaine et immobilière basés sur des données collectées localement. 
              Chaque rapport contient des tableaux, cartes interactives, notes méthodologiques et projections fiscales territorialisées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {publications.map((publication, index) => (
              <Card key={index} className="border-border hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {publication.status}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">
                    {publication.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {publication.period}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {publication.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Résumé PDF (Gratuit)
                    </Button>
                    <Button 
                      className="flex-1" 
                      variant={publication.price === "Gratuit" ? "default" : "default"}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {publication.price === "Gratuit" ? "Télécharger" : "Acheter (MobileMoney)"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-secondary/50 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Restez informé de nos dernières publications
            </h3>
            <p className="text-muted-foreground mb-6">
              Inscrivez-vous à notre newsletter pour recevoir nos rapports dès leur publication.
            </p>
            <Button>S'abonner aux notifications</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Publications;