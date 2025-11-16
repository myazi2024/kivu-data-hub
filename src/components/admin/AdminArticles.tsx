import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useAuth } from '@/hooks/useAuth';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url: string | null;
  theme_id: string;
  author_id: string | null;
  author_name: string | null;
  is_published: boolean;
  published_at: string | null;
  view_count: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Theme {
  id: string;
  name: string;
  short_name: string;
  icon_name: string;
}

export default function AdminArticles() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    theme_id: '',
    cover_image_url: '',
    tags: '',
    is_published: false
  });

  useEffect(() => {
    fetchArticles();
    fetchThemes();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('article_themes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setThemes(data || []);
    } catch (error: any) {
      console.error('Erreur:', error);
    }
  };

  const handleSave = async () => {
    try {
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
      const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const articleData = {
        title: formData.title,
        slug,
        summary: formData.summary,
        content: formData.content,
        theme_id: formData.theme_id,
        cover_image_url: formData.cover_image_url || null,
        tags,
        is_published: formData.is_published,
        author_id: user?.id,
        author_name: user?.email,
        published_at: formData.is_published ? new Date().toISOString() : null
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast.success('Article mis à jour');
      } else {
        const { error } = await supabase
          .from('articles')
          .insert([articleData]);

        if (error) throw error;
        toast.success('Article créé');
      }

      setShowCreateDialog(false);
      setEditingArticle(null);
      resetForm();
      fetchArticles();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('articles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Article supprimé');
      fetchArticles();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      theme_id: article.theme_id,
      cover_image_url: article.cover_image_url || '',
      tags: article.tags?.join(', ') || '',
      is_published: article.is_published
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      theme_id: '',
      cover_image_url: '',
      tags: '',
      is_published: false
    });
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.is_published).length,
    draft: articles.filter(a => !a.is_published).length,
    totalViews: articles.reduce((sum, a) => sum + a.view_count, 0)
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Publiés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Brouillons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Vues Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gestion des Articles
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Button onClick={() => {
                resetForm();
                setEditingArticle(null);
                setShowCreateDialog(true);
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvel Article</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead className="hidden lg:table-cell">Thème</TableHead>
                  <TableHead className="hidden md:table-cell">Vues</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden xl:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun article trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {themes.find(t => t.id === article.theme_id)?.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{article.view_count}</TableCell>
                      <TableCell>
                        {article.is_published ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Publié
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Brouillon
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {format(new Date(article.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(article)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(article.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Modifier l\'article' : 'Nouvel Article'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'article"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="mon-article (optionnel, auto-généré)"
              />
            </div>
            <div>
              <Label>Thème *</Label>
              <Select value={formData.theme_id} onValueChange={(value) => setFormData({ ...formData, theme_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un thème" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Résumé *</Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Résumé de l'article"
                rows={3}
              />
            </div>
            <div>
              <Label>Contenu *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Contenu complet de l'article"
                rows={10}
              />
            </div>
            <div>
              <Label>URL Image de couverture</Label>
              <Input
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Tags (séparés par des virgules)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="immobilier, cadastre, nord-kivu"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label>Publier immédiatement</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingArticle ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
