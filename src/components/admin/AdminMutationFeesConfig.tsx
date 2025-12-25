import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, RefreshCw, Edit2, Trash2, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

interface MutationFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

const AdminMutationFeesConfig = () => {
  const [fees, setFees] = useState<MutationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<MutationFee | null>(null);
  
  const [formData, setFormData] = useState({
    fee_name: '',
    amount_usd: 0,
    description: '',
    is_mandatory: false,
    is_active: true
  });

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mutation_fees_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error fetching mutation fees:', error);
      toast.error('Erreur lors du chargement des frais');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fee_name: '',
      amount_usd: 0,
      description: '',
      is_mandatory: false,
      is_active: true
    });
    setEditingFee(null);
  };

  const openEditDialog = (fee: MutationFee) => {
    setEditingFee(fee);
    setFormData({
      fee_name: fee.fee_name,
      amount_usd: fee.amount_usd,
      description: fee.description || '',
      is_mandatory: fee.is_mandatory,
      is_active: fee.is_active
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.fee_name.trim()) {
      toast.error('Le nom du frais est requis');
      return;
    }

    try {
      if (editingFee) {
        const { error } = await supabase
          .from('mutation_fees_config')
          .update({
            fee_name: formData.fee_name,
            amount_usd: formData.amount_usd,
            description: formData.description || null,
            is_mandatory: formData.is_mandatory,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id);

        if (error) throw error;
        toast.success('Frais mis à jour');
      } else {
        const maxOrder = Math.max(...fees.map(f => f.display_order), 0);
        const { error } = await supabase
          .from('mutation_fees_config')
          .insert({
            fee_name: formData.fee_name,
            amount_usd: formData.amount_usd,
            description: formData.description || null,
            is_mandatory: formData.is_mandatory,
            is_active: formData.is_active,
            display_order: maxOrder + 1
          });

        if (error) throw error;
        toast.success('Frais ajouté');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchFees();
    } catch (error) {
      console.error('Error saving fee:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleToggleActive = async (fee: MutationFee) => {
    try {
      const { error } = await supabase
        .from('mutation_fees_config')
        .update({ is_active: !fee.is_active, updated_at: new Date().toISOString() })
        .eq('id', fee.id);

      if (error) throw error;
      toast.success(fee.is_active ? 'Frais désactivé' : 'Frais activé');
      fetchFees();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleReorder = async (fee: MutationFee, direction: 'up' | 'down') => {
    const currentIndex = fees.findIndex(f => f.id === fee.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= fees.length) return;
    
    const targetFee = fees[targetIndex];
    
    try {
      await supabase.from('mutation_fees_config').update({ display_order: targetFee.display_order }).eq('id', fee.id);
      await supabase.from('mutation_fees_config').update({ display_order: fee.display_order }).eq('id', targetFee.id);
      fetchFees();
    } catch (error) {
      toast.error('Erreur lors du réordonnancement');
    }
  };

  const activeFees = fees.filter(f => f.is_active);
  const totalMandatory = fees.filter(f => f.is_mandatory && f.is_active).reduce((sum, f) => sum + f.amount_usd, 0);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Configuration Frais Mutation</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Gérez les frais de mutation foncière</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchFees} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{fees.length}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total frais</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-green-500">{activeFees.length}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Actifs</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-amber-500">${totalMandatory}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Min. obligatoire</p>
        </Card>
      </div>

      {/* Fees List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Frais configurés</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : fees.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">Aucun frais configuré</p>
        ) : (
          <div className="space-y-2">
            {fees.map((fee, index) => (
              <div key={fee.id} className={`p-2.5 md:p-3 rounded-xl border ${fee.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{fee.fee_name}</span>
                      {fee.is_mandatory && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Obligatoire</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{fee.description || 'Aucune description'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-semibold text-primary">${fee.amount_usd}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(fee, 'up')} disabled={index === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(fee, 'down')} disabled={index === fees.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(fee)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Switch checked={fee.is_active} onCheckedChange={() => handleToggleActive(fee)} className="scale-75" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingFee ? 'Modifier le frais' : 'Ajouter un frais'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du frais *</Label>
              <Input value={formData.fee_name} onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })} placeholder="Ex: Frais de dossier" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Montant (USD) *</Label>
              <Input type="number" min="0" step="0.01" value={formData.amount_usd} onChange={(e) => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) || 0 })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description optionnelle" className="text-sm min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Obligatoire</Label>
              <Switch checked={formData.is_mandatory} onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Actif</Label>
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs">Annuler</Button>
            <Button size="sm" onClick={handleSave} className="h-8 text-xs">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMutationFeesConfig;
