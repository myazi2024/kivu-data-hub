import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, FileText, Search, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RichTextEditor from '@/components/shared/RichTextEditor';
import StorageFileUpload from '@/components/shared/StorageFileUpload';

interface Publication {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  cover_image_url: string | null;
  file_url: string | null;
  price_usd: number;
  category: string;
  status: string;
  featured: boolean;
  download_count: number;
  created_at: string;
  created_by: string | null;
}

interface AdminPublicationsProps { onRefresh: () => void; }

const emptyForm = {
  title: '', description: '', content: '',
  cover_image_url: '', file_url: '',
  price_usd: 0, category: 'research', status: 'draft', featured: false,
};

interface PublicationCategory { id: string; slug: string; name: string; is_active: boolean; }

const AdminPublications: React.FC<AdminPublicationsProps> = ({ onRefresh }) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [categoryFilter, setCategoryFilter] = useState<string>('_all');
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => publications.filter(p => {
    const ms = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const mst = statusFilter === '_all' || p.status === statusFilter;
    const mc = categoryFilter === '_all' || p.category === categoryFilter;
    return ms && mst && mc;
  }), [publications, searchQuery, statusFilter, categoryFilter]);

  const pagination = usePagination(filtered, { initialPageSize: 15 });

  const exportToCSV = () => {
    const csv = [
      ['Titre', 'Catégorie', 'Prix USD', 'Statut', 'Téléchargements', 'Date'].join(','),
      ...filtered.map(p => [
        `"${p.title.replace(/"/g, '""')}"`, p.category, p.price_usd, p.status, p.download_count,
        format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr }),
      ].join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `publications-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  useEffect(() => { fetchPublications(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await (supabase as any)
      .from('publication_categories')
      .select('id, slug, name, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setCategories((data as PublicationCategory[]) || []);
  };


  const fetchPublications = async () => {
    try {
      const { data, error } = await supabase
        .from('publications').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPublications((data as Publication[]) || []);
    } catch {
      toast.error('Erreur chargement publications');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error('Titre requis'); return; }
    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description || null,
        content: formData.content || null,
        cover_image_url: formData.cover_image_url || null,
        file_url: formData.file_url || null,
        price_usd: formData.price_usd,
        category: formData.category,
        status: formData.status,
        featured: formData.featured,
      };
      if (editing) {
        const { error } = await supabase.from('publications').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Publication mise à jour');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('publications').insert([{ ...payload, created_by: user?.id }]);
        if (error) throw error;
        toast.success('Publication créée');
      }
      fetchPublications();
      onRefresh();
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || 'Erreur sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette publication ?')) return;
    const { error } = await supabase.from('publications').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast.error('Erreur suppression');
    toast.success('Publication supprimée');
    fetchPublications();
    onRefresh();
  };

  const openEdit = (p: Publication) => {
    setEditing(p);
    setFormData({
      title: p.title,
      description: p.description || '',
      content: p.content || '',
      cover_image_url: p.cover_image_url || '',
      file_url: p.file_url || '',
      price_usd: p.price_usd,
      category: p.category,
      status: p.status,
      featured: p.featured,
    });
    setOpen(true);
  };

  const resetForm = () => { setEditing(null); setFormData(emptyForm); };

  const getStatusBadge = (status: string) => {
    const v = { draft: 'secondary', published: 'default', archived: 'destructive' } as const;
    return <Badge variant={v[status as keyof typeof v] || 'secondary'}>{status}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-64">Chargement...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Publications ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1">
                <Download className="h-4 w-4" /> Exporter
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Nouvelle</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Modifier' : 'Créer'} une Publication</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="info">Infos</TabsTrigger>
                      <TabsTrigger value="content">Contenu</TabsTrigger>
                      <TabsTrigger value="files">Fichiers</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 pt-4">
                      <div>
                        <Label>Titre *</Label>
                        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                      </div>
                      <div>
                        <Label>Description courte</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Prix (USD)</Label>
                          <Input type="number" step="0.01" value={formData.price_usd}
                            onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label>Catégorie</Label>
                          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="research">Recherche</SelectItem>
                              <SelectItem value="report">Rapport</SelectItem>
                              <SelectItem value="analysis">Analyse</SelectItem>
                              <SelectItem value="guide">Guide</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Statut</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Brouillon</SelectItem>
                              <SelectItem value="published">Publié</SelectItem>
                              <SelectItem value="archived">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                          <Switch checked={formData.featured} onCheckedChange={(v) => setFormData({ ...formData, featured: v })} />
                          <Label>En vedette</Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="content" className="pt-4">
                      <Label>Contenu (description longue)</Label>
                      <RichTextEditor
                        value={formData.content}
                        onChange={(v) => setFormData({ ...formData, content: v })}
                        minHeight={320}
                      />
                    </TabsContent>

                    <TabsContent value="files" className="space-y-4 pt-4">
                      <div>
                        <Label>Image de couverture</Label>
                        <StorageFileUpload
                          bucket="articles"
                          value={formData.cover_image_url || null}
                          onChange={(url) => setFormData({ ...formData, cover_image_url: url || '' })}
                          accept="image/*"
                          isPublic
                          pathPrefix="publication-covers"
                          maxSizeMB={5}
                        />
                      </div>
                      <div>
                        <Label>Fichier PDF (livré après achat)</Label>
                        <StorageFileUpload
                          bucket="publications"
                          value={formData.file_url || null}
                          onChange={(url) => setFormData({ ...formData, file_url: url || '' })}
                          accept="application/pdf"
                          isPublic={false}
                          maxSizeMB={50}
                          label="PDF privé (téléchargement post-achat)"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Le fichier reste privé. Le téléchargement se fait via une URL signée après paiement.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editing ? 'Mettre à jour' : 'Créer'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toutes catégories</SelectItem>
                <SelectItem value="research">Recherche</SelectItem>
                <SelectItem value="report">Rapport</SelectItem>
                <SelectItem value="analysis">Analyse</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Tél.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune publication</TableCell></TableRow>
            ) : pagination.paginatedData.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <span>{p.title}</span>
                  </div>
                </TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>${p.price_usd}</TableCell>
                <TableCell>
                  {p.file_url
                    ? <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />PDF</Badge>
                    : <Badge variant="secondary">Aucun</Badge>}
                </TableCell>
                <TableCell>{getStatusBadge(p.status)}</TableCell>
                <TableCell>{p.download_count}</TableCell>
                <TableCell>{format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination.totalPages > 1 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            hasNextPage={pagination.hasNextPage}
            hasPreviousPage={pagination.hasPreviousPage}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
            onNextPage={pagination.goToNextPage}
            onPreviousPage={pagination.goToPreviousPage}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPublications;
