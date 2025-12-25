import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DollarSign, Plus, Edit2, Trash2, Loader2, RefreshCw, 
  Settings, CheckCircle, AlertCircle
} from 'lucide-react';

interface ExpertiseFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

export const AdminExpertiseFeesConfig: React.FC = () => {
  const [fees, setFees] = useState<ExpertiseFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<ExpertiseFee | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [feeName, setFeeName] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeMandatory, setFeeMandatory] = useState(true);
  const [feeActive, setFeeActive] = useState(true);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expertise_fees_config')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setFees((data || []) as ExpertiseFee[]);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Erreur lors du chargement des frais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const resetForm = () => {
    setFeeName('');
    setFeeAmount('');
    setFeeDescription('');
    setFeeMandatory(true);
    setFeeActive(true);
    setEditingFee(null);
  };

  const openEditDialog = (fee: ExpertiseFee) => {
    setEditingFee(fee);
    setFeeName(fee.fee_name);
    setFeeAmount(fee.amount_usd.toString());
    setFeeDescription(fee.description || '');
    setFeeMandatory(fee.is_mandatory);
    setFeeActive(fee.is_active);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!feeName || !feeAmount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingFee) {
        const { error } = await supabase
          .from('expertise_fees_config')
          .update({
            fee_name: feeName,
            amount_usd: parseFloat(feeAmount),
            description: feeDescription || null,
            is_mandatory: feeMandatory,
            is_active: feeActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id);

        if (error) throw error;
        toast.success('Frais modifié avec succès');
      } else {
        const { error } = await supabase
          .from('expertise_fees_config')
          .insert({
            fee_name: feeName,
            amount_usd: parseFloat(feeAmount),
            description: feeDescription || null,
            is_mandatory: feeMandatory,
            is_active: feeActive,
            display_order: fees.length + 1
          });

        if (error) throw error;
        toast.success('Frais ajouté avec succès');
      }

      setShowDialog(false);
      resetForm();
      fetchFees();
    } catch (error) {
      console.error('Error saving fee:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (feeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce frais ?')) return;

    try {
      const { error } = await supabase
        .from('expertise_fees_config')
        .update({ is_active: false })
        .eq('id', feeId);

      if (error) throw error;
      toast.success('Frais désactivé');
      fetchFees();
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const activeFees = fees.filter(f => f.is_active);
  const totalMandatory = activeFees.filter(f => f.is_mandatory).reduce((sum, f) => sum + f.amount_usd, 0);

  return (
    <div className="space-y-4 max-w-[360px] mx-auto md:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm md:text-lg font-bold flex items-center gap-2">
            <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Config Frais Expertise
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Gérez les frais d'expertise immobilière
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={fetchFees} className="h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg md:text-xl font-bold">{activeFees.length}</p>
            <p className="text-[10px] text-muted-foreground">Frais actifs</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-primary">${totalMandatory}</p>
            <p className="text-[10px] text-muted-foreground">Obligatoires</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-green-600">
              {activeFees.filter(f => f.is_mandatory).length}
            </p>
            <p className="text-[10px] text-muted-foreground">Requis</p>
          </CardContent>
        </Card>
      </div>

      {/* Fees List */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Liste des frais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Aucun frais configuré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fees.map((fee) => (
                <div
                  key={fee.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    fee.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{fee.fee_name}</p>
                      {fee.is_mandatory && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          Obligatoire
                        </Badge>
                      )}
                      {!fee.is_active && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          Inactif
                        </Badge>
                      )}
                    </div>
                    {fee.description && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {fee.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-bold text-primary">${fee.amount_usd}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(fee)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleDelete(fee.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {editingFee ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingFee ? 'Modifier le frais' : 'Nouveau frais'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nom du frais *</Label>
              <Input
                value={feeName}
                onChange={(e) => setFeeName(e.target.value)}
                placeholder="Ex: Frais de dossier"
                className="h-9 text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Montant (USD) *</Label>
              <Input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={feeDescription}
                onChange={(e) => setFeeDescription(e.target.value)}
                placeholder="Description optionnelle..."
                className="text-sm rounded-xl min-h-[60px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Frais obligatoire</Label>
              <Switch checked={feeMandatory} onCheckedChange={setFeeMandatory} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Actif</Label>
              <Switch checked={feeActive} onCheckedChange={setFeeActive} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} className="text-xs">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {editingFee ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpertiseFeesConfig;
