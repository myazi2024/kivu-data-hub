import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PermitFee {
  id: string;
  permit_type: 'construction' | 'regularization';
  fee_name: string;
  amount_usd: number;
  description: string;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export default function AdminPermitFeesConfig() {
  const [fees, setFees] = useState<PermitFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<PermitFee | null>(null);
  const [formData, setFormData] = useState({
    permit_type: 'construction' as 'construction' | 'regularization',
    fee_name: '',
    amount_usd: '',
    description: '',
    is_mandatory: true,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permit_fees_config')
        .select('*')
        .order('permit_type')
        .order('display_order');

      if (error) throw error;
      setFees((data || []) as PermitFee[]);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des frais');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fee?: PermitFee) => {
    if (fee) {
      setEditingFee(fee);
      setFormData({
        permit_type: fee.permit_type,
        fee_name: fee.fee_name,
        amount_usd: fee.amount_usd.toString(),
        description: fee.description || '',
        is_mandatory: fee.is_mandatory,
        is_active: fee.is_active,
        display_order: fee.display_order
      });
    } else {
      setEditingFee(null);
      setFormData({
        permit_type: 'construction',
        fee_name: '',
        amount_usd: '',
        description: '',
        is_mandatory: true,
        is_active: true,
        display_order: 0
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.fee_name || !formData.amount_usd) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const payload = {
        permit_type: formData.permit_type,
        fee_name: formData.fee_name,
        amount_usd: parseFloat(formData.amount_usd),
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
        display_order: formData.display_order
      };

      if (editingFee) {
        const { error } = await supabase
          .from('permit_fees_config')
          .update(payload)
          .eq('id', editingFee.id);
        if (error) throw error;
        toast.success('Frais modifié avec succès');
      } else {
        const { error } = await supabase
          .from('permit_fees_config')
          .insert(payload);
        if (error) throw error;
        toast.success('Frais ajouté avec succès');
      }

      setDialogOpen(false);
      fetchFees();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce frais ?')) return;

    try {
      const { error } = await supabase
        .from('permit_fees_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Frais supprimé');
      fetchFees();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const constructionFees = fees.filter(f => f.permit_type === 'construction');
  const regularizationFees = fees.filter(f => f.permit_type === 'regularization');

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuration des frais de permis</CardTitle>
              <CardDescription>
                Gérez les frais applicables pour les demandes de permis
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un frais
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Autorisation de bâtir */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Autorisation de bâtir</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du frais</TableHead>
                  <TableHead>Montant (USD)</TableHead>
                  <TableHead>Obligatoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constructionFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.fee_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {fee.amount_usd}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.is_mandatory ? 'default' : 'secondary'}>
                        {fee.is_mandatory ? 'Oui' : 'Non'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.is_active ? 'default' : 'secondary'}>
                        {fee.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(fee)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Autorisation de régularisation */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Autorisation de régularisation</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du frais</TableHead>
                  <TableHead>Montant (USD)</TableHead>
                  <TableHead>Obligatoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularizationFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.fee_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {fee.amount_usd}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.is_mandatory ? 'default' : 'secondary'}>
                        {fee.is_mandatory ? 'Oui' : 'Non'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.is_active ? 'default' : 'secondary'}>
                        {fee.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(fee)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Modifier le frais' : 'Ajouter un frais'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de permis</Label>
              <Select
                value={formData.permit_type}
                onValueChange={(value: 'construction' | 'regularization') =>
                  setFormData({ ...formData, permit_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construction">Permis de construire</SelectItem>
                  <SelectItem value="regularization">Permis de régularisation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom du frais *</Label>
              <Input
                value={formData.fee_name}
                onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })}
                placeholder="Ex: Frais d'examen du dossier"
              />
            </div>
            <div>
              <Label>Montant (USD) *</Label>
              <Input
                type="number"
                value={formData.amount_usd}
                onChange={(e) => setFormData({ ...formData, amount_usd: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du frais..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Frais obligatoire</Label>
              <Switch
                checked={formData.is_mandatory}
                onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Actif</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingFee ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}