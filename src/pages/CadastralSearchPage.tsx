import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralSearchWithMap from '@/components/cadastral/CadastralSearchWithMap';
import { Helmet } from 'react-helmet';

const CadastralSearchPage = () => {
  return (
    <>
      <Helmet>
        <title>Cadastre Collaboratif - Plateforme de Recherche Cadastrale RDC</title>
        <meta 
          name="description" 
          content="Recherchez et consultez les informations cadastrales des parcelles en RDC. Accédez à la carte interactive, historique de propriété, obligations fiscales et plus encore." 
        />
        <meta 
          name="keywords" 
          content="cadastre, RDC, parcelle, recherche cadastrale, carte cadastrale, titre foncier, Nord-Kivu, Goma" 
        />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 bg-gradient-to-b from-background to-secondary/5 py-8">
          <CadastralSearchWithMap />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CadastralSearchPage;
