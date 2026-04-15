import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import PartnersSection from '@/components/PartnersSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>BIC - Bureau d'Informations Cadastrales | Données foncières en RDC</title>
        <meta name="description" content="Accédez aux informations cadastrales de la RDC : recherche de parcelles, titres fonciers, carte interactive et services fonciers numériques." />
      </Helmet>
      <div className="min-h-dvh">
      <Navigation />
      <HeroSection />
      <PartnersSection />
      <Footer />
    </div>
    </>
  );
};

export default Index;
