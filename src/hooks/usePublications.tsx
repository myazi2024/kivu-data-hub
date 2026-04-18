import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Publication {
  id: string;
  title: string;
  description?: string;
  price_usd: number;
  status: string;
  category: string;
  cover_image_url?: string;
  created_at: string;
  featured: boolean;
  file_url?: string;
  tags?: string[];
  download_count: number;
}

export const usePublications = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPublications(data || []);
    } catch (error) {
      const errorMessage = 'Impossible de charger les publications';
      console.error('Error fetching publications:', error);
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchPublications();
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  return {
    publications,
    loading,
    error,
    refetch,
  };
};