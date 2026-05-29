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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, AlertCircle, DollarSign, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CADASTRAL_SERVICE_CATEGORIES,
  type CadastralServiceCategory,
  getCadastralCategoryMeta,
} from '@/constants/cadastralServiceCategories';
import { validateRequiredDataFieldsJson } from '@/lib/cadastralServiceRules';
import { resolveLucideIcon } from '@/lib/lucideIconMap';
import { trackEvent } from '@/lib/analytics';

interface CadastralServiceRow {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  icon_name: string | null;
  display_order: number | null;
  required_data_fields: Json | null;
  category: CadastralServiceCategory | string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminCadastralServicesProps {
  onRefresh?: () => void;
}

const AdminCadastralServices: React.FC<AdminCadastralServicesProps> = ({ onRefresh }) => {
  const [services, setServices] = useState<CadastralServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<CadastralServiceRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requiredDataFieldsText, setRequiredDataFieldsText] = useState('');
  const [requiredDataFieldsError, setRequiredDataFieldsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    service_id: '',
    name: '',
    description: '',
    price_usd: 0,
    is_active: true,
    icon_name: '',
    display_order: 0,
    category: 'consultation' as CadastralServiceCategory,
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; serviceId: string; usage: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('cadastral_services_config')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('service_id', { ascending: true });
      if (!showDeleted) query = query.is('deleted_at', null);

      const { data, error } = await query;

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

      // Validation stricte du JSON de règles de disponibilité.
      const ruleValidation = validateRequiredDataFieldsJson(requiredDataFieldsText);
      if (!ruleValidation.valid) {
        setRequiredDataFieldsError(ruleValidation.error || 'Spec invalide');
        toast.error(ruleValidation.error || 'Le JSON des règles est invalide');
        return;
      }
      setRequiredDataFieldsError(null);

      // Pré-check unicité service_id en création (évite erreur Postgres opaque).
      if (!editingService) {
        const { data: existing } = await supabase
          .from('cadastral_services_config')
          .select('id')
          .eq('service_id', formData.service_id)
          .maybeSingle();
        if (existing) {
          toast.error(`Le service_id "${formData.service_id}" existe déjà. Choisissez un identifiant unique.`);
          return;
        }
      }

      const previousCategory = editingService?.category ?? null;
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price_usd: formData.price_usd,
        is_active: formData.is_active,
        icon_name: formData.icon_name || null,
        display_order: formData.display_order || 0,
        required_data_fields: ruleValidation.parsed as unknown as Json | null,
        category: formData.category,
      };

      if (editingService) {
        const { error } = await supabase
          .from('cadastral_services_config')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('✅ Service mis à jour avec succès');
        trackEvent('cadastral_catalog_service_updated', {
          service_id: formData.service_id,
        });
      } else {
        const { error } = await supabase
          .from('cadastral_services_config')
          .insert([{ ...payload, service_id: formData.service_id }]);

        if (error) throw error;
        toast.success('✅ Service créé avec succès');
        trackEvent('cadastral_catalog_service_created', {
          service_id: formData.service_id,
          category: formData.category,
        });
      }

      if (editingService && previousCategory !== formData.category) {
        trackEvent('cadastral_catalog_category_changed', {
          service_id: formData.service_id,
          from: previousCategory,
          to: formData.category,
        });
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

  const requestDelete = async (id: string, serviceId: string) => {
    // Pré-compte l'usage pour décider entre soft-delete et message explicite.
    const { count } = await supabase
      .from('cadastral_invoices')
      .select('id', { count: 'exact', head: true })
      .contains('selected_services', [serviceId]);
    setDeleteTarget({ id, serviceId, usage: count ?? 0 });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, serviceId } = deleteTarget;
    setDeleting(true);
    try {
      // Soft-delete : on marque `deleted_at` + `is_active=false` au lieu d'un DELETE
      // permanent. Préserve l'intégrité historique des libellés PDF de factures.
      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('✅ Service archivé (soft-delete). Restaurable depuis la corbeille.');
      trackEvent('cadastral_catalog_service_deleted', { service_id: serviceId, soft: true });
      fetchServices();
      if (onRefresh) onRefresh();
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const restoreService = async (id: string, serviceId: string) => {
    try {
      const { error } = await supabase
        .from('cadastral_services_config')
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('✅ Service restauré');
      trackEvent('cadastral_catalog_service_restored', { service_id: serviceId });
      fetchServices();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la restauration');
    }
  };

  const openEditDialog = (service: CadastralServiceRow) => {
    setEditingService(service);
    setFormData({
      service_id: service.service_id,
      name: service.name,
      description: service.description || '',
      price_usd: Number(service.price_usd),
      is_active: service.is_active,
      icon_name: service.icon_name || '',
      display_order: service.display_order ?? 0,
      category: (service.category as CadastralServiceCategory) || 'consultation',
    });
    setRequiredDataFieldsText(
      service.required_data_fields ? JSON.stringify(service.required_data_fields, null, 2) : ''
    );
    setRequiredDataFieldsError(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      service_id: '',
      name: '',
      description: '',
      price_usd: 0,
      is_active: true,
      icon_name: '',
      display_order: 0,
      category: 'consultation',
    });
    setRequiredDataFieldsText('');
    setRequiredDataFieldsError(null);
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gestion du Catalogue de Services Cadastraux
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
                <Label htmlFor="show-deleted" className="cursor-pointer">Afficher la corbeille</Label>
              </div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_order">Ordre d'affichage</Label>
                      <Input
                        id="display_order"
                        type="number"
                        min="0"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="icon_name">Icône Lucide</Label>
                      <Input
                        id="icon_name"
                        value={formData.icon_name}
                        onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                        placeholder="ex: FileText, MapPin, History"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nom exact d'une icône <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="underline">lucide.dev</a>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Catégorie *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v as CadastralServiceCategory })}
                      >
                        <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CADASTRAL_SERVICE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{getCadastralCategoryMeta(c).label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Aperçu icône</Label>
                      <div className="h-10 flex items-center gap-2 px-3 rounded-md border bg-muted/20">
                        {(() => {
                          if (!formData.icon_name) return <span className="text-xs text-muted-foreground">Saisir un nom d'icône Lucide</span>;
                          const Icon = resolveLucideIcon(formData.icon_name);
                          const Fallback = resolveLucideIcon('___invalid___');
                          const isValid = Icon !== Fallback;
                          return isValid
                            ? <><Icon className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{formData.icon_name}</span></>
                            : <span className="text-xs text-destructive">Icône inconnue</span>;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="required_data_fields">Règles de disponibilité (JSON)</Label>
                    <Textarea
                      id="required_data_fields"
                      value={requiredDataFieldsText}
                      onChange={(e) => {
                        setRequiredDataFieldsText(e.target.value);
                        setRequiredDataFieldsError(null);
                      }}
                      rows={6}
                      className="font-mono text-xs"
                      placeholder={`{\n  "mode": "any",\n  "rules": [\n    { "type": "non_empty_array", "field": "ownership_history" }\n  ]\n}`}
                    />
                    {requiredDataFieldsError && (
                      <p className="text-xs text-destructive mt-1">{requiredDataFieldsError}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Optionnel. Détermine si la parcelle dispose des données pour ce service.
                      Types : <code>always_true</code>, <code>truthy</code> (champ + companion), <code>non_empty_array</code>.
                      Mode : <code>any</code> (au moins une règle) ou <code>all</code> (toutes).
                    </p>
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordre</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Icône</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Règles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="text-sm text-muted-foreground">{service.display_order ?? '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{service.service_id}</TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCadastralCategoryMeta(service.category).className}>
                      {getCadastralCategoryMeta(service.category).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{service.icon_name || '—'}</TableCell>
                  <TableCell>${Number(service.price_usd).toFixed(2)}</TableCell>
                  <TableCell>
                    {service.required_data_fields ? (
                      <Badge variant="outline">Configurées</Badge>
                    ) : (
                      <Badge variant="secondary">Aucune</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
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
                        onClick={() => requestDelete(service.id, service.service_id)}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement le service{' '}
              <span className="font-mono font-semibold">{deleteTarget?.serviceId}</span>.
              Cette action est irréversible. Si le service est référencé dans des factures, la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCadastralServices;
