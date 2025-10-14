import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit2, DollarSign, Save, X, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(200, "Le nom ne peut dépasser 200 caractères")
    .trim(),
  description: z.string()
    .max(1000, "La description ne peut dépasser 1000 caractères")
    .trim()
    .optional()
    .or(z.literal('')),
  price_usd: z.number()
    .min(0, "Le prix doit être positif")
    .max(10000, "Prix maximum: 10,000$")
    .multipleOf(0.01, "Le prix doit avoir au maximum 2 décimales"),
  is_active: z.boolean()
});

interface Service {
  id: string;
  service_id: string;
  name: string;
  description?: string | null;
  price_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ServiceUsage {
  is_used: boolean;
  usage_count: number;
  can_delete: boolean;
}

const AdminServicesConfig = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [serviceUsage, setServiceUsage] = useState<ServiceUsage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_usd: 0,
    is_active: true
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_services_config')
        .select('*')
        .is('deleted_at', null)
        .order('service_id', { ascending: true });

      if (error) throw error;
      setServices(data || []);
      setFilteredServices(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filtrer les services selon la recherche
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices(services);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = services.filter(service => 
      service.name.toLowerCase().includes(query) ||
      service.service_id.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query)
    );
    setFilteredServices(filtered);
  }, [searchQuery, services]);

  const handleSave = async () => {
    try {
      // Validation avec zod
      const validatedData = serviceSchema.parse(formData);

      if (editingService) {
        // Mode modification
        const { error } = await supabase
          .from('cadastral_services_config')
          .update({
            name: validatedData.name,
            description: validatedData.description || null,
            price_usd: validatedData.price_usd,
            is_active: validatedData.is_active
          })
          .eq('id', editingService.id);
        
        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Service mis à jour avec succès",
        });
      } else {
        // Mode création - Génération automatique du service_id
        const { data: generatedId, error: idError } = await supabase
          .rpc('generate_service_id', { service_name: validatedData.name });
        
        if (idError) throw idError;
        
        const { error } = await supabase
          .from('cadastral_services_config')
          .insert({
            service_id: generatedId,
            name: validatedData.name,
            description: validatedData.description || null,
            price_usd: validatedData.price_usd,
            is_active: validatedData.is_active
          });
        
        if (error) throw error;
        
        toast({
          title: "Succès",
          description: `Service créé avec ID: ${generatedId}`,
        });
      }

      setIsDialogOpen(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Erreur lors de la sauvegarde:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder le service",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price_usd: service.price_usd,
      is_active: service.is_active
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (service: Service) => {
    try {
      // Vérifier si le service est utilisé avant de le désactiver
      if (service.is_active) {
        const { data: usage } = await supabase
          .rpc('check_service_usage', { service_id_param: service.service_id });
        
        const usageData = usage as unknown as ServiceUsage;
        if (usageData?.is_used) {
          toast({
            title: "Attention",
            description: `Ce service est utilisé dans ${usageData.usage_count} facture(s). Êtes-vous sûr de vouloir le désactiver ?`,
            variant: "default",
          });
        }
      }

      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: `Service ${!service.is_active ? 'activé' : 'désactivé'} avec succès`,
      });
      
      fetchServices();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le service",
        variant: "destructive",
      });
    }
  };

  const handleCreate = () => {
    setEditingService(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const checkServiceUsage = async (service: Service) => {
    try {
      const { data, error } = await supabase
        .rpc('check_service_usage', { service_id_param: service.service_id });
      
      if (error) throw error;
      const usageData = data as unknown as ServiceUsage;
      setServiceUsage(usageData);
      return usageData;
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier l'utilisation du service",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDeleteClick = async (service: Service) => {
    const usage = await checkServiceUsage(service);
    setDeletingService(service);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingService) return;

    try {
      // Soft delete
      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingService.id);
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: "Service supprimé avec succès",
      });
      
      setIsDeleteDialogOpen(false);
      setDeletingService(null);
      setServiceUsage(null);
      fetchServices();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le service",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_usd: 0,
      is_active: true
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <CardTitle>Configuration des Services Cadastraux</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {services.length} service{services.length > 1 ? 's' : ''} configuré{services.length > 1 ? 's' : ''}
                {searchQuery && ` • ${filteredServices.length} résultat${filteredServices.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, ID ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Service</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Prix (USD)</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'Aucun service trouvé' : 'Aucun service configuré'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-mono text-sm">{service.service_id}</TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {service.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(service.price_usd)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleActive(service)}
                        />
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(service)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Création/Modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Modifier' : 'Créer'} un service</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du service *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Informations générales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du service"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_usd">Prix (USD) *</Label>
              <Input
                id="price_usd"
                type="number"
                step="0.01"
                min="0"
                max="10000"
                value={formData.price_usd}
                onChange={(e) => setFormData({...formData, price_usd: Number(e.target.value)})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active">Service actif</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingService ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              {serviceUsage?.is_used ? (
                <div className="space-y-2">
                  <p className="font-semibold text-destructive">
                    ⚠️ Ce service est utilisé dans {serviceUsage.usage_count} facture(s) !
                  </p>
                  <p>
                    La suppression n'empêchera pas les factures existantes de fonctionner, 
                    mais le service ne sera plus disponible pour de nouvelles commandes.
                  </p>
                </div>
              ) : (
                <p>Êtes-vous sûr de vouloir supprimer ce service ?</p>
              )}
              <p className="mt-2 font-medium">
                Service: <span className="font-mono">{deletingService?.service_id}</span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminServicesConfig;
