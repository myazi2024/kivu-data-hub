import React, { useEffect, useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { PublicationCard } from '@/components/publications/PublicationCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [filteredPublications, setFilteredPublications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch publications from Supabase
  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const { data, error } = await supabase
          .from('publications')
          .select('*')
          .eq('status', 'published')
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPublications(data || []);
        setFilteredPublications(data || []);
      } catch (error) {
        console.error('Error fetching publications:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les publications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublications();
  }, []);

  // Filter publications based on search and category
  useEffect(() => {
    let filtered = publications;

    if (searchTerm) {
      filtered = filtered.filter(pub =>
        pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pub.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(pub => pub.category === categoryFilter);
    }

    setFilteredPublications(filtered);
  }, [publications, searchTerm, categoryFilter]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-center items-start mb-8">
            <div className="text-center max-w-3xl">
              <h1 className="text-4xl font-bold text-foreground mb-6">Kiosque Publications</h1>
              <p className="text-lg text-muted-foreground">
                Le BIC publie régulièrement des rapports d'analyse urbaine et immobilière basés sur des données collectées localement. 
                Chaque rapport contient des tableaux, cartes interactives, notes méthodologiques et projections fiscales territorialisées.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-secondary/20 rounded-lg">
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

          {/* Publications Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-secondary/50 h-48 rounded-t-lg"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-secondary/50 rounded w-3/4"></div>
                    <div className="h-4 bg-secondary/50 rounded w-1/2"></div>
                    <div className="h-20 bg-secondary/50 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune publication trouvée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredPublications.map((publication) => (
                <PublicationCard key={publication.id} publication={publication} />
              ))}
            </div>
          )}

          {/* Newsletter Section */}
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