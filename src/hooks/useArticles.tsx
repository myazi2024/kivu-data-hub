import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ArticleTheme {
  id: string;
  name: string;
  short_name: string;
  description?: string;
  icon_name: string;
  display_order: number;
}

export interface Article {
  id: string;
  theme_id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url?: string;
  author_name?: string;
  tags?: string[];
  view_count: number;
  published_at: string;
  created_at: string;
  article_themes?: ArticleTheme;
}

export const useArticleThemes = () => {
  const [themes, setThemes] = useState<ArticleTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const { data, error } = await supabase
          .from('article_themes')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setThemes(data || []);
      } catch (error) {
        console.error('Error fetching themes:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les thématiques",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, [toast]);

  return { themes, loading };
};

export const useArticles = (themeId?: string) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('articles')
          .select(`
            *,
            article_themes(*)
          `)
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (themeId) {
          query = query.eq('theme_id', themeId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error('Error fetching articles:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les articles",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [themeId, toast]);

  return { articles, loading };
};

export const useArticleBySlug = (slug: string) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('articles')
          .select(`
            *,
          article_themes(*)
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

        if (error) throw error;
        
        // Incrémenter le compteur de vues
        if (data) {
          await supabase
            .from('articles')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', data.id);
        }
        
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'article",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug, toast]);

  return { article, loading };
};
