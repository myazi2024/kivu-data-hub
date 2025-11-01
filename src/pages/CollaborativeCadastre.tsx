import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CollaborativeCadastralMapSimple from '@/components/cadastral/CollaborativeCadastralMapSimple';

const CollaborativeCadastre = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CollaborativeCadastralMapSimple />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CollaborativeCadastre;
