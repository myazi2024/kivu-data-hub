import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Save } from 'lucide-react';
import type { MutationFee } from '@/types/mutation';

interface MutationFeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFee: MutationFee | null;
  feeName: string;
  onNameChange: (v: string) => void;
  feeAmount: string;
  onAmountChange: (v: string) => void;
  feeDescription: string;
  onDescriptionChange: (v: string) => void;
  feeMandatory: boolean;
  onMandatoryChange: (v: boolean) => void;
  onSave: () => void;
}

const MutationFeeFormDialog: React.FC<MutationFeeFormDialogProps> = ({
  open,
  onOpenChange,
  editingFee,
  feeName,
  onNameChange,
  feeAmount,
  onAmountChange,
  feeDescription,
  onDescriptionChange,
  feeMandatory,
  onMandatoryChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {editingFee ? 'Modifier le frais' : 'Ajouter un frais'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Nom du frais *</Label>
            <Input
              value={feeName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: Frais de dossier"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Montant (USD) *</Label>
            <Input
              type="number"
              value={feeAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="25.00"
              className="h-9"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={feeDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description optionnelle..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mandatory"
              checked={feeMandatory}
              onCheckedChange={(checked) => onMandatoryChange(!!checked)}
            />
            <Label htmlFor="mandatory" className="text-xs cursor-pointer">
              Frais obligatoire
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MutationFeeFormDialog;
