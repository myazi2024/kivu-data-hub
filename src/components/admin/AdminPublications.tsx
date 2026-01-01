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
import { Plus, Edit, Trash2, FileText, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Publication {
  id: string;
  title: string;
  description: string;
  price_usd: number;
  category: string;
  status: string;
  featured: boolean;
  download_count: number;
  created_at: string;
  created_by: string;
}

interface AdminPublicationsProps {
  onRefresh: () => void;
}

const AdminPublications: React.FC<AdminPublicationsProps> = ({ onRefresh }) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [categoryFilter, setCategoryFilter] = useState<string>('_all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    price_usd: 0,
    category: 'research',
    status: 'draft',
    featured: false
  });

  // Filtered publications
  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      const matchesSearch = pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pub.description && pub.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === '_all' || pub.status === statusFilter;
      const matchesCategory = categoryFilter === '_all' || pub.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [publications, searchQuery, statusFilter, categoryFilter]);

  // Pagination
  const pagination = usePagination(filteredPublications, { initialPageSize: 10 });

  // CSV Export
  const exportToCSV = () => {
    const csv = [
      ['Titre', 'Catégorie', 'Prix USD', 'Statut', 'Téléchargements', 'Date'].join(','),
      ...filteredPublications.map(p => [
        `"${p.title.replace(/"/g, '""')}"`,
        p.category,
        p.price_usd,
        p.status,
        p.download_count,
        format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublications(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des publications:', error);
      toast.error('Erreur lors du chargement des publications');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingPublication) {
        const { error } = await supabase
          .from('publications')
          .update(formData)
          .eq('id', editingPublication.id);
        
        if (error) throw error;
        toast.success('Publication mise à jour avec succès');
      } else {
        const { error } = await supabase
          .from('publications')
          .insert([{ ...formData, created_by: (await supabase.auth.getUser()).data.user?.id }]);
        
        if (error) throw error;
        toast.success('Publication créée avec succès');
      }
      
      fetchPublications();
      onRefresh();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return;
    
    try {
      const { error } = await supabase
        .from('publications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Publication supprimée avec succès');
      fetchPublications();
      onRefresh();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (publication: Publication) => {
    setEditingPublication(publication);
    setFormData({
      title: publication.title,
      description: publication.description || '',
      content: '',
      price_usd: publication.price_usd,
      category: publication.category,
      status: publication.status,
      featured: publication.featured
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPublication(null);
    setFormData({
      title: '',
      description: '',
      content: '',
      price_usd: 0,
      category: 'research',
      status: 'draft',
      featured: false
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      published: 'default',
      archived: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gestion des Publications ({filteredPublications.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1">
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Publication
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPublication ? 'Modifier' : 'Créer'} une Publication
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de la publication"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description de la publication"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Prix (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price_usd}
                      onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="research">Recherche</SelectItem>
                        <SelectItem value="report">Rapport</SelectItem>
                        <SelectItem value="analysis">Analyse</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="published">Publié</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave}>
                    {editingPublication ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre ou description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
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
              <TableHead>Statut</TableHead>
              <TableHead>Téléchargements</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== '_all' || categoryFilter !== '_all' 
                    ? 'Aucune publication trouvée avec ces filtres' 
                    : 'Aucune publication'}
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedData.map((publication) => (
                <TableRow key={publication.id}>
                  <TableCell className="font-medium">{publication.title}</TableCell>
                  <TableCell>{publication.category}</TableCell>
                  <TableCell>${publication.price_usd}</TableCell>
                  <TableCell>{getStatusBadge(publication.status)}</TableCell>
                  <TableCell>{publication.download_count}</TableCell>
                  <TableCell>{format(new Date(publication.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(publication)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(publication.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
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