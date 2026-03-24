import React, { useEffect, useState, useMemo } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { PublicationCard } from '@/components/publications/PublicationCard';
import { usePublications } from '@/hooks/usePublications';

const Publications = () => {
  const { publications, loading, error } = usePublications();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Optimized filtering with useMemo
  const filteredPublications = useMemo(() => {
    let filtered = publications;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pub =>
        pub.title.toLowerCase().includes(searchLower) ||
        pub.description?.toLowerCase().includes(searchLower) ||
        pub.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(pub => pub.category === categoryFilter);
    }

    return filtered;
  }, [publications, searchTerm, categoryFilter]);

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header - Compact */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Publications</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Rapports d'analyse cadastrale et foncière avec données locales, cartes interactives et projections fiscales.
            </p>
          </div>

          {/* Filters - Compact */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 p-2 sm:p-3 bg-secondary/20 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher un rapport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="research">Recherche</SelectItem>
                  <SelectItem value="analysis">Analyse</SelectItem>
                  <SelectItem value="report">Rapport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Publications Grid - Compact */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-secondary/50 h-32 sm:h-36 rounded-t-lg"></div>
                  <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                    <div className="h-2 sm:h-3 bg-secondary/50 rounded w-3/4"></div>
                    <div className="h-2 sm:h-3 bg-secondary/50 rounded w-1/2"></div>
                    <div className="h-8 sm:h-12 bg-secondary/50 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Aucune publication trouvée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {filteredPublications.map((publication) => (
                <PublicationCard key={publication.id} publication={publication} />
              ))}
            </div>
          )}

          {/* Newsletter Section - Compact */}
          <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 text-center">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              Newsletter
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 max-w-md mx-auto">
              Recevez nos rapports dès leur publication.
            </p>
            <Button size="sm" className="text-xs sm:text-sm px-4 py-2">
              S'abonner
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Publications;