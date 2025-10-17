import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, AlertCircle, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CadastralService {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminCadastralServicesProps {
  onRefresh?: () => void;
}

const AdminCadastralServices: React.FC<AdminCadastralServicesProps> = ({ onRefresh }) => {
  const [services, setServices] = useState<CadastralService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<CadastralService | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    service_id: '',
    name: '',
    description: '',
    price_usd: 0,
    is_active: true
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_services_config')
        .select('*')
        .order('service_id', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.service_id || !formData.name || formData.price_usd <= 0) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (editingService) {
        const { error } = await supabase
          .from('cadastral_services_config')
          .update({
            name: formData.name,
            description: formData.description,
            price_usd: formData.price_usd,
            is_active: formData.is_active
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('cadastral_services_config')
          .insert([formData]);

        if (error) throw error;
        toast.success('Service créé avec succès');
      }

      fetchServices();
      if (onRefresh) onRefresh();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string, serviceId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le service "${serviceId}" ?`)) return;

    try {
      // Vérifier l'utilisation directement dans les factures
      const { data: invoices, error: invoiceError } = await supabase
        .from('cadastral_invoices')
        .select('id, selected_services')
        .limit(1000);

      if (invoiceError) throw invoiceError;

      // Compter les factures utilisant ce service
      let usageCount = 0;
      invoices?.forEach(invoice => {
        let services: string[] = [];
        if (Array.isArray(invoice.selected_services)) {
          services = invoice.selected_services.filter((item): item is string => typeof item === 'string');
        } else if (typeof invoice.selected_services === 'string') {
          try {
            services = JSON.parse(invoice.selected_services);
          } catch {
            services = [];
          }
        }
        if (services.includes(serviceId)) {
          usageCount++;
        }
      });

      if (usageCount > 0) {
        toast.error(
          `Ce service est utilisé dans ${usageCount} facture(s). Désactivez-le plutôt que de le supprimer.`,
          { duration: 5000 }
        );
        return;
      }

      const { error } = await supabase
        .from('cadastral_services_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Service supprimé avec succès');
      fetchServices();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openEditDialog = (service: CadastralService) => {
    setEditingService(service);
    setFormData({
      service_id: service.service_id,
      name: service.name,
      description: service.description || '',
      price_usd: Number(service.price_usd),
      is_active: service.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      service_id: '',
      name: '',
      description: '',
      price_usd: 0,
      is_active: true
    });
  };

  const totalRevenue = services.reduce((sum, s) => sum + Number(s.price_usd), 0);
  const activeServices = services.filter(s => s.is_active).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Services Actifs</p>
                <p className="text-2xl font-bold">{activeServices}</p>
              </div>
              <Badge variant="default">{((activeServices / services.length) * 100).toFixed(0)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur Catalogue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Les modifications des services impactent directement le catalogue client. 
          Les services désactivés n'apparaîtront plus aux utilisateurs.
        </AlertDescription>
      </Alert>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gestion du Catalogue de Services Cadastraux
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Modifier le service' : 'Créer un nouveau service'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service_id">ID du service *</Label>
                    <Input
                      id="service_id"
                      value={formData.service_id}
                      onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                      placeholder="ex: information, history, obligations"
                      disabled={!!editingService}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Identifiant unique sans espaces (non modifiable après création)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="name">Nom du service *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ex: Informations générales"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description détaillée du service..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_usd">Prix (USD) *</Label>
                    <Input
                      id="price_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_usd}
                      onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Service actif</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave}>
                    {editingService ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière MAJ</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm">{service.service_id}</TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>${Number(service.price_usd).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(service.updated_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(service.id, service.service_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCadastralServices;
