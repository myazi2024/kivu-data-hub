import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Edit, Trash, CheckCircle, XCircle, TrendingUp, Calendar, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useAuth } from '@/hooks/useAuth';
import RichTextEditor from '@/components/shared/RichTextEditor';
import StorageFileUpload from '@/components/shared/StorageFileUpload';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url: string | null;
  og_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  theme_id: string;
  author_id: string | null;
  author_name: string | null;
  author_display_name: string | null;
  is_published: boolean;
  published_at: string | null;
  scheduled_at: string | null;
  view_count: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Theme { id: string; name: string; short_name: string; icon_name: string; }

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const emptyForm = {
  title: '', slug: '', summary: '', content: '',
  theme_id: '', cover_image_url: '', og_image_url: '',
  meta_title: '', meta_description: '',
  author_display_name: '',
  tags: '',
  is_published: false,
  scheduled_at: '',
};

export default function AdminArticles() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchArticles(); fetchThemes(); }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles').select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) toast.error('Erreur chargement articles');
    setArticles((data as Article[]) || []);
    setLoading(false);
  };

  const fetchThemes = async () => {
    const { data } = await supabase
      .from('article_themes').select('id,name,short_name,icon_name')
      .eq('is_active', true).order('display_order');
    setThemes(data || []);
  };

  // Slug unique check
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    let q = supabase.from('articles').select('id', { count: 'exact', head: true }).eq('slug', slug);
    if (editingArticle) q = q.neq('id', editingArticle.id);
    const { count } = await q;
    setSlugStatus((count || 0) > 0 ? 'taken' : 'ok');
  }, [editingArticle]);

  useEffect(() => {
    if (!showCreateDialog) return;
    const t = setTimeout(() => checkSlug(formData.slug), 350);
    return () => clearTimeout(t);
  }, [formData.slug, showCreateDialog, checkSlug]);

  const handleTitleChange = (title: string) => {
    setFormData(f => ({
      ...f,
      title,
      slug: f.slug || slugify(title),
      meta_title: f.meta_title || title,
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.theme_id || !formData.summary.trim()) {
      toast.error('Titre, thème et résumé requis');
      return;
    }
    if (slugStatus === 'taken') {
      toast.error('Ce slug est déjà utilisé');
      return;
    }
    setSaving(true);
    try {
      const slug = formData.slug || slugify(formData.title);
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const articleData = {
        title: formData.title.trim(),
        slug,
        summary: formData.summary.trim(),
        content: formData.content,
        theme_id: formData.theme_id,
        cover_image_url: formData.cover_image_url || null,
        og_image_url: formData.og_image_url || null,
        meta_title: formData.meta_title?.slice(0, 60) || null,
        meta_description: formData.meta_description?.slice(0, 160) || null,
        author_display_name: formData.author_display_name || null,
        tags,
        is_published: formData.is_published,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        published_at: formData.is_published
          ? (editingArticle?.published_at || new Date().toISOString())
          : null,
        author_id: editingArticle?.author_id || user?.id,
        // ⚠ author_name conservé pour compat, mais l'affichage public utilise author_display_name
        author_name: editingArticle?.author_name || formData.author_display_name || null,
      };

      if (editingArticle) {
        const { error } = await supabase.from('articles').update(articleData).eq('id', editingArticle.id);
        if (error) throw error;
        toast.success('Article mis à jour');
      } else {
        const { error } = await supabase.from('articles').insert([articleData]);
        if (error) throw error;
        toast.success('Article créé');
      }
      setShowCreateDialog(false);
      setEditingArticle(null);
      setFormData(emptyForm);
      fetchArticles();
    } catch (e: any) {
      toast.error(e.message || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    const { error } = await supabase.from('articles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast.error('Erreur suppression');
    toast.success('Article supprimé');
    fetchArticles();
  };

  const handleEdit = (a: Article) => {
    setEditingArticle(a);
    setFormData({
      title: a.title,
      slug: a.slug,
      summary: a.summary,
      content: a.content,
      theme_id: a.theme_id,
      cover_image_url: a.cover_image_url || '',
      og_image_url: a.og_image_url || '',
      meta_title: a.meta_title || '',
      meta_description: a.meta_description || '',
      author_display_name: a.author_display_name || '',
      tags: a.tags?.join(', ') || '',
      is_published: a.is_published,
      scheduled_at: a.scheduled_at ? a.scheduled_at.slice(0, 16) : '',
    });
    setShowCreateDialog(true);
  };

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.is_published).length,
    scheduled: articles.filter(a => a.scheduled_at && !a.is_published).length,
    draft: articles.filter(a => !a.is_published && !a.scheduled_at).length,
    totalViews: articles.reduce((s, a) => s + (a.view_count || 0), 0),
  };

  if (loading) return <div className="flex items-center justify-center h-64">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Publiés" value={stats.published} accent="text-success" />
        <StatCard label="Programmés" value={stats.scheduled} accent="text-primary" />
        <StatCard label="Brouillons" value={stats.draft} accent="text-muted-foreground" />
        <StatCard label="Vues" value={stats.totalViews} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Gestion des Articles</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-full sm:w-64" />
              </div>
              <Button onClick={() => { setFormData(emptyForm); setEditingArticle(null); setShowCreateDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nouvel Article</span>
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
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun article</TableCell></TableRow>
                ) : filteredArticles.map(article => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {article.cover_image_url && (
                          <img src={article.cover_image_url} alt="" className="h-8 w-12 rounded object-cover" />
                        )}
                        <span>{article.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{themes.find(t => t.id === article.theme_id)?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{article.view_count}</TableCell>
                    <TableCell>
                      {article.is_published ? (
                        <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Publié</Badge>
                      ) : article.scheduled_at ? (
                        <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />Programmé</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Brouillon</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {format(new Date(article.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(article)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(article.id)}><Trash className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Modifier l\'article' : 'Nouvel Article'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="media">Média & Auteur</TabsTrigger>
              <TabsTrigger value="seo">SEO & Publication</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 pt-4">
              <div>
                <Label>Titre *</Label>
                <Input value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Titre" />
              </div>
              <div>
                <Label>Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                    placeholder="mon-article"
                    className={slugStatus === 'taken' ? 'border-destructive' : slugStatus === 'ok' ? 'border-success' : ''}
                  />
                  {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {slugStatus === 'ok' && <CheckCircle className="h-4 w-4 text-success" />}
                  {slugStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
                {slugStatus === 'taken' && <p className="text-xs text-destructive mt-1">Ce slug est déjà utilisé</p>}
              </div>
              <div>
                <Label>Thème *</Label>
                <Select value={formData.theme_id} onValueChange={(v) => setFormData({ ...formData, theme_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un thème" /></SelectTrigger>
                  <SelectContent>
                    {themes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Résumé *</Label>
                <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Contenu</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(v) => setFormData({ ...formData, content: v })}
                  minHeight={320}
                />
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4 pt-4">
              <div>
                <Label>Image de couverture</Label>
                <StorageFileUpload
                  bucket="articles"
                  value={formData.cover_image_url || null}
                  onChange={(url) => setFormData({ ...formData, cover_image_url: url || '' })}
                  accept="image/*"
                  isPublic
                  pathPrefix="covers"
                  maxSizeMB={5}
                  label="Image de couverture (JPG/PNG/WebP)"
                />
              </div>
              <div>
                <Label>Nom d'affichage de l'auteur</Label>
                <Input
                  value={formData.author_display_name}
                  onChange={(e) => setFormData({ ...formData, author_display_name: e.target.value })}
                  placeholder="Ex: Rédaction BIC, J. Mukendi…"
                />
                <p className="text-xs text-muted-foreground mt-1">Affiché publiquement à la place de l'email admin.</p>
              </div>
              <div>
                <Label>Tags (séparés par des virgules)</Label>
                <Input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="immobilier, cadastre" />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 pt-4">
              <div>
                <Label>Meta title (≤60 car.)</Label>
                <Input
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  maxLength={60}
                />
                <p className="text-[10px] text-muted-foreground mt-1">{formData.meta_title.length}/60</p>
              </div>
              <div>
                <Label>Meta description (≤160 car.)</Label>
                <Textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  maxLength={160}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground mt-1">{formData.meta_description.length}/160</p>
              </div>
              <div>
                <Label>Image OpenGraph (partage réseaux sociaux)</Label>
                <StorageFileUpload
                  bucket="articles"
                  value={formData.og_image_url || null}
                  onChange={(url) => setFormData({ ...formData, og_image_url: url || '' })}
                  accept="image/*"
                  isPublic
                  pathPrefix="og"
                  maxSizeMB={3}
                  label="OG Image (1200x630 recommandé)"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_published} onCheckedChange={(c) => setFormData({ ...formData, is_published: c, scheduled_at: c ? '' : formData.scheduled_at })} />
                  <Label>Publier immédiatement</Label>
                </div>
                <div>
                  <Label className="text-xs">Ou programmer la publication</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    disabled={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || slugStatus === 'taken'}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingArticle ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatCard = ({ label, value, accent, icon }: { label: string; value: number; accent?: string; icon?: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </CardTitle>
    </CardHeader>
    <CardContent><div className={`text-2xl font-bold ${accent || ''}`}>{value}</div></CardContent>
  </Card>
);
