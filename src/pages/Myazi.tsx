import React, { useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import CadastralResultsDialog from '@/components/cadastral/CadastralResultsDialog';
import CadastralServicesCatalog from '@/components/cadastral/CadastralServicesCatalog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';

const Myazi = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchParcel, searchResult, loading, error } = useCadastralSearch();
  const [showResults, setShowResults] = useState(false);
  const [showContribution, setShowContribution] = useState(false);
  const [contributionUnlockedFields, setContributionUnlockedFields] = useState<string[]>([]);
  const [contributionParcel, setContributionParcel] = useState('');
  const [contributionTargetTab, setContributionTargetTab] = useState<string>('general');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await searchParcel(searchQuery);
    if (searchResult) {
      setShowResults(true);
    }
  };

  const handleContributeClick = (serviceId: string, missingFieldKeys: string[]) => {
    console.log('🔧 Contribution demandée:', { serviceId, missingFieldKeys });
    
    setContributionUnlockedFields(missingFieldKeys);
    setContributionParcel(searchQuery);
    
    // Mapper le serviceId vers l'onglet correspondant
    const tabMapping: Record<string, string> = {
      'information_generale': 'general',
      'localisation': 'location',
      'historique_proprietaires': 'history',
      'obligations': 'obligations'
    };
    const targetTab = tabMapping[serviceId] || 'general';
    console.log('🎯 Onglet cible:', targetTab, '| Champs déverrouillés:', missingFieldKeys);
    
    setContributionTargetTab(targetTab);
    setShowContribution(true);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section de recherche */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Recherche Cadastrale</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Entrez le numéro de parcelle (ex: SU/2024/001/TEST)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Rechercher
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </Card>

          {/* Afficher le catalogue avec les résultats si disponibles */}
          {searchResult ? (
            <CadastralServicesCatalog 
              searchResult={searchResult}
              onContributeClick={handleContributeClick}
            />
          ) : (
            <CadastralServicesCatalog />
          )}
        </div>
      </main>

      {/* Dialog des résultats */}
      {searchResult && (
        <CadastralResultsDialog
          result={searchResult}
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          onContribute={(serviceId, fieldKey) => {
            // Convertir un seul fieldKey en array pour handleContributeClick
            handleContributeClick(serviceId, [fieldKey]);
          }}
        />
      )}

      {/* Dialog de contribution */}
      <CadastralContributionDialog
        open={showContribution}
        onOpenChange={(open) => {
          setShowContribution(open);
          if (!open) {
            // Réinitialiser les champs à la fermeture
            setContributionUnlockedFields([]);
            setContributionTargetTab('general');
          }
        }}
        parcelNumber={contributionParcel}
        unlockedFields={contributionUnlockedFields.length > 0 ? contributionUnlockedFields : undefined}
        targetTab={contributionTargetTab}
      />

      <Footer />
    </div>
  );
};

export default Myazi;