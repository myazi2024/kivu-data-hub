import React from 'react';
import Navigation from '@/components/ui/navigation';
import CollaborativeCadastralMap from '@/components/cadastral/CollaborativeCadastralMap';

const CollaborativeCadastre = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <CollaborativeCadastralMap />
      </main>
    </div>
  );
};

export default CollaborativeCadastre;
