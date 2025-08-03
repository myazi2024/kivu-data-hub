import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, DollarSign, Users, FileText, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Publication {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  file_url?: string;
  thumbnail_url?: string;
  is_published: boolean;
  created_at: string;
}

const Admin = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [stats, setStats] = useState({
    totalPublications: 0,
    totalRevenue: 0,
    totalDownloads: 0,
    activeUsers: 0
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    currency: 'USD',
    file_url: '',
    thumbnail_url: '',
    is_published: false
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPublications();
    fetchStats();
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
      toast({
        title: "Erreur",
        description: "Impossible de charger les publications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Statistiques publications
      const { count: pubCount } = await supabase
        .from('publications')
        .select('*', { count: 'exact', head: true });

      // Statistiques téléchargements et revenus
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, currency, status');

      const totalRevenue = paymentsData
        ?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

      const { count: downloadCount } = await supabase
        .from('publication_downloads')
        .select('*', { count: 'exact', head: true });

      // Utilisateurs actifs (profiles)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalPublications: pubCount || 0,
        totalRevenue: totalRevenue / 100, // Convertir de centimes
        totalDownloads: downloadCount || 0,
        activeUsers: userCount || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPublication) {
        const { error } = await supabase
          .from('publications')
          .update(formData)
          .eq('id', editingPublication.id);
        
        if (error) throw error;
        toast({ title: "Publication modifiée avec succès" });
      } else {
        const { error } = await supabase
          .from('publications')
          .insert([{ ...formData, created_by: user?.id }]);
        
        if (error) throw error;
        toast({ title: "Publication créée avec succès" });
      }

      resetForm();
      fetchPublications();
      fetchStats();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la publication",
        variant: "destructive"
      });
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
      
      toast({ title: "Publication supprimée" });
      fetchPublications();
      fetchStats();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la publication",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: 0,
      currency: 'USD',
      file_url: '',
      thumbnail_url: '',
      is_published: false
    });
    setEditingPublication(null);
    setShowCreateDialog(false);
  };

  const startEdit = (publication: Publication) => {
    setFormData({
      title: publication.title,
      description: publication.description,
      price: publication.price,
      currency: publication.currency,
      file_url: publication.file_url || '',
      thumbnail_url: publication.thumbnail_url || '',
      is_published: publication.is_published
    });
    setEditingPublication(publication);
    setShowCreateDialog(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Administration</h1>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Publications</p>
                  <p className="text-2xl font-bold">{stats.totalPublications}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus</p>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Téléchargements</p>
                  <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Publications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gestion des Publications</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Titre"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                  <Textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Prix"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                    />
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="CDF">CDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="URL du fichier"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  />
                  <Input
                    placeholder="URL de l'image de couverture"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  />
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    />
                    <span>Publier immédiatement</span>
                  </label>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingPublication ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {publications.map((publication) => (
                <div key={publication.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{publication.title}</h3>
                    <p className="text-sm text-muted-foreground">{publication.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={publication.is_published ? "default" : "secondary"}>
                        {publication.is_published ? 'Publié' : 'Brouillon'}
                      </Badge>
                      <span className="text-sm font-medium">
                        {publication.price} {publication.currency}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(publication)}
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;