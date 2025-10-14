import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralServicesCatalog from '@/components/cadastral/CadastralServicesCatalog';

const CadastralServices = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CadastralServicesCatalog />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CadastralServices;
