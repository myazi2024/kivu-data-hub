import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit2, DollarSign, Save, X } from 'lucide-react';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(500).optional(),
  price_usd: z.number().min(0, "Le prix doit être positif").max(1000, "Prix maximum: 1000$"),
  is_active: z.boolean()
});

interface Service {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  price_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminServicesConfig = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        .order('service_id', { ascending: true });

      if (error) throw error;
      setServices(data || []);
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

  const handleSave = async () => {
    try {
      // Validation avec zod
      const validatedData = serviceSchema.parse(formData);

      if (editingService) {
        const { error } = await supabase
          .from('cadastral_services_config')
          .update({
            name: validatedData.name,
            description: validatedData.description,
            price_usd: validatedData.price_usd,
            is_active: validatedData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingService.id);
        
        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Service mis à jour avec succès",
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
      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ 
          is_active: !service.is_active,
          updated_at: new Date().toISOString()
        })
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
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Configuration des Services Cadastraux</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              {services.map((service) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le service</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du service</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Informations générales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du service"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_usd">Prix (USD)</Label>
              <Input
                id="price_usd"
                type="number"
                step="0.01"
                min="0"
                max="1000"
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
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServicesConfig;
