import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralTestRunner from '@/components/cadastral/CadastralTestRunner';

const TestCadastral = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 pb-8 bg-gradient-to-b from-background to-secondary/5">
        <CadastralTestRunner />
      </main>
      <Footer />
    </div>
  );
};

export default TestCadastral;
