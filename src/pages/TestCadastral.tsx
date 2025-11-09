import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralTestRunner from '@/components/cadastral/CadastralTestRunner';

const TestCadastral = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <CadastralTestRunner />
      </main>
      <Footer />
    </div>
  );
};

export default TestCadastral;
